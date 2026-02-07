import type { GestureType } from '../core/types.ts';

/** Maximum velocity magnitude (scene units/s). Prevents particles flying off-screen when two force fields overlap. */
const MAX_SPEED = 5.0;

/**
 * Pre-allocated ring-buffer particle pool.
 *
 * All particle data lives in fixed-size Float32Arrays allocated once at
 * construction. A cursor-based ring buffer handles spawning by overwriting
 * the oldest slot. Dead particles are swapped with the last active particle
 * to keep the active region contiguous for efficient GPU draw range.
 *
 * Zero dynamic allocation during the render loop.
 */
export class ParticlePool {
  /** Maximum number of particles the pool can hold. */
  readonly maxCount: number;

  /** Flat xyz positions (maxCount * 3). */
  private readonly positions: Float32Array;
  /** Flat xyz velocities (maxCount * 3). CPU-only, not a buffer attribute. */
  private readonly velocities: Float32Array;
  /** Flat rgb colors (maxCount * 3). */
  private readonly colors: Float32Array;
  /** Per-particle sizes (maxCount). */
  private readonly sizes: Float32Array;
  /** Per-particle lifetime progress 0..1 (maxCount). 0 = just born, 1 = dead. */
  private readonly lifetimes: Float32Array;
  /** Per-particle decay rate: 1 / totalLifetime (maxCount). */
  private readonly decayRates: Float32Array;

  /** Number of currently alive particles. */
  private activeCount = 0;
  /** Optional ceiling on active particles (for quality scaling). */
  private maxActive: number;

  constructor(maxCount = 1500) {
    this.maxCount = maxCount;
    this.maxActive = maxCount;

    this.positions = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);
    this.sizes = new Float32Array(maxCount);
    this.lifetimes = new Float32Array(maxCount);
    this.decayRates = new Float32Array(maxCount);
  }

  /**
   * Spawn a new particle at the cursor position.
   *
   * @param x      - World x position
   * @param y      - World y position
   * @param vx     - Velocity x
   * @param vy     - Velocity y
   * @param r      - Red channel (0-1)
   * @param g      - Green channel (0-1)
   * @param b      - Blue channel (0-1)
   * @param size   - Point size in pixels
   * @param lifetime - Total lifetime in seconds
   */
  spawn(
    x: number, y: number,
    vx: number, vy: number,
    r: number, g: number, b: number,
    size: number, lifetime: number,
  ): void {
    if (this.activeCount >= this.maxActive) return;

    // Always append at the end of the active region so new particles
    // fall within the [0, activeCount) draw range after compaction.
    const i = this.activeCount;
    const i3 = i * 3;

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = 0; // z = 0 for 2D overlay

    this.velocities[i3] = vx;
    this.velocities[i3 + 1] = vy;
    this.velocities[i3 + 2] = 0;

    this.colors[i3] = r;
    this.colors[i3 + 1] = g;
    this.colors[i3 + 2] = b;

    this.sizes[i] = size;
    this.lifetimes[i] = 0; // just born
    this.decayRates[i] = lifetime > 0 ? 1 / lifetime : 1;

    this.activeCount++;
  }

  /**
   * Advance all alive particles by dt seconds.
   * Dead particles are swapped with the last active to keep the buffer contiguous.
   *
   * @returns The number of currently active particles.
   */
  update(dt: number): number {
    let i = 0;
    while (i < this.activeCount) {
      // Advance lifetime
      this.lifetimes[i] += this.decayRates[i] * dt;

      if (this.lifetimes[i] >= 1.0) {
        // Particle is dead -- swap with last active
        this.activeCount--;
        if (i < this.activeCount) {
          this.swapParticles(i, this.activeCount);
        }
        // Re-check the same index (now holds the swapped particle)
        continue;
      }

      // Move by velocity
      const i3 = i * 3;
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;

      // Slight velocity damping for natural deceleration
      this.velocities[i3] *= 0.995;
      this.velocities[i3 + 1] *= 0.995;

      // Velocity magnitude cap (prevents extreme speeds from dual force fields)
      const vx = this.velocities[i3];
      const vy = this.velocities[i3 + 1];
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        this.velocities[i3] *= scale;
        this.velocities[i3 + 1] *= scale;
      }

      i++;
    }

    return this.activeCount;
  }

  /**
   * Apply a gesture-driven force field to all active particles within radius.
   * Called from main.ts when a gesture is active.
   *
   * Force behaviors:
   * - push: radial outward explosion from hand position
   * - attract: particles orbit and float around the hand (spring equilibrium + tangential)
   */
  applyForceField(
    handX: number,
    handY: number,
    gestureType: GestureType,
    radius: number,
    strength: number,
    dt: number,
  ): void {
    // Attract equilibrium: particles orbit at ~20% of the radius (tight around hand)
    const equilibrium = radius * 0.20;

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3;
      const dx = this.positions[i3] - handX;
      const dy = this.positions[i3 + 1] - handY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius || dist < 0.001) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      if (gestureType === 'push') {
        // Radial outward explosion — punchy, explosive
        const t = 1.0 - dist / radius;
        const force = strength * t * t;
        this.velocities[i3]     += nx * force * dt;
        this.velocities[i3 + 1] += ny * force * dt;
      } else if (gestureType === 'attract') {
        // Spring orbit: pull inward when far from equilibrium, push out when too close
        const springForce = (dist - equilibrium) * strength * 0.8;
        // Tangential force for orbiting (perpendicular to radial)
        const t = 1.0 - dist / radius;
        const tangentForce = strength * t * 0.6;

        // Radial spring: negative = pull inward, positive = push outward
        this.velocities[i3]     -= nx * springForce * dt;
        this.velocities[i3 + 1] -= ny * springForce * dt;
        // Tangential orbit
        this.velocities[i3]     += (-ny) * tangentForce * dt;
        this.velocities[i3 + 1] += nx * tangentForce * dt;

        // Damping: slow particles down so they settle into orbit instead of flying through
        this.velocities[i3]     *= 1.0 - 2.0 * dt;
        this.velocities[i3 + 1] *= 1.0 - 2.0 * dt;
      }
    }
  }

  /** Return the positions typed array. Consumer must set needsUpdate on the BufferAttribute. */
  getPositions(): Float32Array {
    return this.positions;
  }

  /** Return the colors typed array. */
  getColors(): Float32Array {
    return this.colors;
  }

  /** Return the sizes typed array. */
  getSizes(): Float32Array {
    return this.sizes;
  }

  /** Return the lifetimes typed array. */
  getLifetimes(): Float32Array {
    return this.lifetimes;
  }

  /** Return the number of currently alive particles. */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Cap the maximum active particle count for quality scaling.
   * Does NOT resize arrays -- just limits how many particles can be alive.
   */
  setMaxActive(n: number): void {
    this.maxActive = Math.max(0, Math.min(n, this.maxCount));
  }

  /** Swap all data between two particle indices. */
  private swapParticles(a: number, b: number): void {
    const a3 = a * 3;
    const b3 = b * 3;

    // Swap positions
    this.swapFloat3(this.positions, a3, b3);
    // Swap velocities
    this.swapFloat3(this.velocities, a3, b3);
    // Swap colors
    this.swapFloat3(this.colors, a3, b3);

    // Swap scalars
    this.swapFloat1(this.sizes, a, b);
    this.swapFloat1(this.lifetimes, a, b);
    this.swapFloat1(this.decayRates, a, b);
  }

  private swapFloat3(arr: Float32Array, a: number, b: number): void {
    let tmp: number;
    tmp = arr[a]; arr[a] = arr[b]; arr[b] = tmp;
    tmp = arr[a + 1]; arr[a + 1] = arr[b + 1]; arr[b + 1] = tmp;
    tmp = arr[a + 2]; arr[a + 2] = arr[b + 2]; arr[b + 2] = tmp;
  }

  private swapFloat1(arr: Float32Array, a: number, b: number): void {
    const tmp = arr[a];
    arr[a] = arr[b];
    arr[b] = tmp;
  }
}
