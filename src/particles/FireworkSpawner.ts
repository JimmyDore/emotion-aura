import {
  FIREWORK_PARTICLE_COUNT,
  FIREWORK_SPEED_MIN,
  FIREWORK_SPEED_MAX,
  FIREWORK_LIFETIME_MIN,
  FIREWORK_LIFETIME_MAX,
  FIREWORK_SIZE_MIN,
  FIREWORK_SIZE_MAX,
  FIREWORK_SCREEN_X_FACTOR,
  FIREWORK_COLOR_JITTER,
  FIREWORK_ORIGIN_JITTER,
  FIREWORK_COLOR_GOLD,
  FIREWORK_COLOR_CYAN,
} from '../core/constants.ts';
import { ParticleSystem } from './ParticleSystem.ts';
import type { WinkSide } from '../core/types.ts';

/**
 * Spawn a radial firework burst into the shared particle system.
 *
 * Particles expand outward from a single tight point with no gravity,
 * lingering and drifting for 5-8 seconds before fading.
 *
 * @param particleSystem - The shared ParticleSystem instance
 * @param side - Which screen side to place the burst ('left' = GOLD, 'right' = CYAN)
 * @param aspect - Current viewport aspect ratio (width / height)
 */
export function spawnFirework(
  particleSystem: ParticleSystem,
  side: WinkSide,
  aspect: number,
): void {
  // Burst center X: left side = negative, right side = positive
  const centerX = side === 'left'
    ? -aspect * FIREWORK_SCREEN_X_FACTOR
    : aspect * FIREWORK_SCREEN_X_FACTOR;
  const centerY = 0;

  // Base color: GOLD for left, CYAN for right
  const baseColor = side === 'left' ? FIREWORK_COLOR_GOLD : FIREWORK_COLOR_CYAN;

  for (let i = 0; i < FIREWORK_PARTICLE_COUNT; i++) {
    // Random radial direction
    const angle = Math.random() * Math.PI * 2;
    const speed = FIREWORK_SPEED_MIN + Math.random() * (FIREWORK_SPEED_MAX - FIREWORK_SPEED_MIN);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Color jitter for visual richness
    const r = Math.max(0, Math.min(1, baseColor[0] + (Math.random() - 0.5) * FIREWORK_COLOR_JITTER * 2));
    const g = Math.max(0, Math.min(1, baseColor[1] + (Math.random() - 0.5) * FIREWORK_COLOR_JITTER * 2));
    const b = Math.max(0, Math.min(1, baseColor[2] + (Math.random() - 0.5) * FIREWORK_COLOR_JITTER * 2));

    // Random size and lifetime
    const size = FIREWORK_SIZE_MIN + Math.random() * (FIREWORK_SIZE_MAX - FIREWORK_SIZE_MIN);
    const lifetime = FIREWORK_LIFETIME_MIN + Math.random() * (FIREWORK_LIFETIME_MAX - FIREWORK_LIFETIME_MIN);

    // Origin jitter: minimal spread from single point
    const ox = (Math.random() - 0.5) * FIREWORK_ORIGIN_JITTER * 2;
    const oy = (Math.random() - 0.5) * FIREWORK_ORIGIN_JITTER * 2;

    particleSystem.spawn(
      centerX + ox, centerY + oy,
      vx, vy,
      r, g, b,
      size, lifetime,
    );
  }
}
