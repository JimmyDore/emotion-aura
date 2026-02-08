import {
  FIREWORK_PARTICLE_COUNT,
  FIREWORK_SPEED_MIN,
  FIREWORK_SPEED_MAX,
  FIREWORK_LIFETIME_MIN,
  FIREWORK_LIFETIME_MAX,
  FIREWORK_SIZE_MIN,
  FIREWORK_SIZE_MAX,
  FIREWORK_X_MIN_FACTOR,
  FIREWORK_X_MAX_FACTOR,
  FIREWORK_Y_RANGE,
  FIREWORK_COLOR_JITTER,
  FIREWORK_ORIGIN_JITTER,
  FIREWORK_COLOR_PALETTE,
} from '../core/constants.ts';
import { ParticleSystem } from './ParticleSystem.ts';
import type { WinkSide } from '../core/types.ts';

/** Rotating index into the color palette. */
let colorIndex = 0;

/**
 * Spawn a radial firework burst into the shared particle system.
 *
 * Each call picks the next color from the palette and a random position
 * within the corresponding screen half.
 *
 * @param particleSystem - The shared ParticleSystem instance
 * @param side - Which screen half to place the burst ('left' or 'right')
 * @param aspect - Current viewport aspect ratio (width / height)
 */
export function spawnFirework(
  particleSystem: ParticleSystem,
  side: WinkSide,
  aspect: number,
): void {
  // Random X within the screen half (between 20% and 90% of half-width)
  const xFactor = FIREWORK_X_MIN_FACTOR + Math.random() * (FIREWORK_X_MAX_FACTOR - FIREWORK_X_MIN_FACTOR);
  const centerX = side === 'left'
    ? -aspect * xFactor
    : aspect * xFactor;

  // Random Y within vertical range
  const centerY = (Math.random() - 0.5) * FIREWORK_Y_RANGE * 2;

  // Pick next color from rotating palette
  const baseColor = FIREWORK_COLOR_PALETTE[colorIndex % FIREWORK_COLOR_PALETTE.length];
  colorIndex++;

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
