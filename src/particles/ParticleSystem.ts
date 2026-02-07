import * as THREE from 'three';
import { ParticlePool } from './ParticlePool.ts';
import vertexShader from './shaders/particle.vert.glsl';
import fragmentShader from './shaders/particle.frag.glsl';
import { MAX_PIXEL_RATIO, MAX_PARTICLES } from '../core/constants.ts';

/**
 * GPU particle renderer using Three.js Points with custom ShaderMaterial.
 *
 * Owns a ParticlePool (ring-buffer) and a Points mesh with additive blending.
 * Provides init/update/dispose lifecycle and spawn delegation to the pool.
 *
 * The vertex shader applies simplex noise displacement for organic motion.
 * The fragment shader renders soft radial glow with lifetime-based fade.
 */
export class ParticleSystem {
  private readonly pool: ParticlePool;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points;
  private readonly scene: THREE.Scene;

  private readonly positionAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly lifeAttr: THREE.BufferAttribute;

  constructor(scene: THREE.Scene, maxParticles = MAX_PARTICLES) {
    this.scene = scene;
    this.pool = new ParticlePool(maxParticles);

    // Create BufferGeometry with pre-allocated attributes from the pool
    this.geometry = new THREE.BufferGeometry();

    this.positionAttr = new THREE.BufferAttribute(this.pool.getPositions(), 3)
      .setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(this.pool.getColors(), 3)
      .setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.pool.getSizes(), 1)
      .setUsage(THREE.DynamicDrawUsage);
    this.lifeAttr = new THREE.BufferAttribute(this.pool.getLifetimes(), 1)
      .setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aLife', this.lifeAttr);

    // No particles visible initially
    this.geometry.setDrawRange(0, 0);

    // Custom ShaderMaterial with additive blending for ethereal glow
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO) },
        uSpawnCenter: { value: new THREE.Vector2(0, 0) },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    // Create Points mesh and add to scene
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  /**
   * Update particle simulation and sync GPU buffers.
   *
   * @param dt   - Delta time in seconds since last frame
   * @param time - Total elapsed time in seconds (for shader noise)
   */
  update(dt: number, time: number): void {
    const active = this.pool.update(dt);

    // Update draw range to only render alive particles
    this.geometry.setDrawRange(0, active);

    // Signal GPU buffer updates
    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.lifeAttr.needsUpdate = true;

    // Update time uniform for noise displacement
    this.material.uniforms.uTime.value = time;
  }

  /**
   * Spawn a single particle. Delegates to the pool's ring buffer.
   */
  spawn(
    x: number, y: number,
    vx: number, vy: number,
    r: number, g: number, b: number,
    size: number, lifetime: number,
  ): void {
    this.pool.spawn(x, y, vx, vy, r, g, b, size, lifetime);
  }

  /** Update the spawn center uniform (used by vertex shader). */
  setSpawnCenter(x: number, y: number): void {
    this.material.uniforms.uSpawnCenter.value.set(x, y);
  }

  /** Expose pool reference for quality scaling (QualityScaler in Plan 03). */
  getPool(): ParticlePool {
    return this.pool;
  }

  /** Dispose all GPU resources and remove from scene. */
  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
