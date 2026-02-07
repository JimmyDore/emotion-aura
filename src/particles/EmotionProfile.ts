import type { EmotionType, EmotionScores } from '../core/types.ts';
/**
 * Data-driven visual configuration for a single emotion.
 * Each field describes how particles should look and behave
 * when this emotion is dominant. Pure data -- no rendering logic.
 */
export interface EmotionProfileConfig {
  /** Primary and secondary colors as [r, g, b] tuples (0-1 range). */
  colors: [number, number, number][];
  /** Base particle speed (scene units per second). */
  speed: number;
  /** Primary direction vector [dx, dy] (normalized) -- particles flow this way. */
  direction: [number, number];
  /** Angular spread in radians (0 = tight beam, PI = hemisphere). */
  spread: number;
  /** Size multiplier relative to PARTICLE_SIZE_BASE. */
  sizeMultiplier: number;
  /** Lifetime multiplier relative to PARTICLE_LIFETIME_BASE. */
  lifetimeMultiplier: number;
  /** Spawn rate multiplier relative to SPAWN_RATE_BASE. */
  spawnRateMultiplier: number;
  /** Noise amplitude multiplier for organic motion (1.0 = default). */
  noiseAmplitude: number;
}

/**
 * Emotion visual profiles -- one per EmotionType.
 *
 * Each profile encodes color palette, motion direction, speed,
 * spread, and scaling factors that make each emotion visually distinct.
 * The particle renderer reads these configs instead of branching on emotion type.
 */
export const EMOTION_PROFILES: Record<EmotionType, EmotionProfileConfig> = {
  // Warm, lively, upward (gold/pink tones, firefly-like)
  happy: {
    colors: [
      [1.0, 0.85, 0.3],  // gold
      [1.0, 0.5, 0.7],   // pink
      [1.0, 0.95, 0.6],  // warm yellow
    ],
    speed: 0.4,
    direction: [0, 1],   // upward
    spread: Math.PI * 0.7,
    sizeMultiplier: 1.2,
    lifetimeMultiplier: 1.0,
    spawnRateMultiplier: 1.3,
    noiseAmplitude: 1.2,  // playful organic drift
  },

  // Cool, slow, downward (blue tones, rain-like)
  sad: {
    colors: [
      [0.3, 0.5, 0.9],   // medium blue
      [0.2, 0.3, 0.7],   // deep blue
      [0.5, 0.6, 0.85],  // pale blue
    ],
    speed: 0.15,
    direction: [0, -1],  // downward
    spread: Math.PI * 0.3,
    sizeMultiplier: 0.8,
    lifetimeMultiplier: 1.5,  // linger longer
    spawnRateMultiplier: 0.7,
    noiseAmplitude: 0.4,  // minimal drift, straight rain feel
  },

  // Aggressive, fast, radial (red/orange tones, flame-like)
  angry: {
    colors: [
      [1.0, 0.2, 0.1],   // red
      [1.0, 0.5, 0.0],   // orange
      [1.0, 0.8, 0.2],   // fire yellow
    ],
    speed: 0.7,
    direction: [0, 0],   // radial outward from center
    spread: Math.PI * 1.0,
    sizeMultiplier: 1.0,
    lifetimeMultiplier: 0.6,  // burn out fast
    spawnRateMultiplier: 1.8,
    noiseAmplitude: 1.8,  // chaotic turbulent motion
  },

  // Burst/explosion, fast radial (cyan/yellow tones)
  surprised: {
    colors: [
      [0.3, 1.0, 1.0],   // cyan
      [1.0, 1.0, 0.4],   // yellow
      [0.6, 0.9, 1.0],   // light cyan
    ],
    speed: 1.0,
    direction: [0, 0],   // radial outward burst
    spread: Math.PI * 1.0,
    sizeMultiplier: 1.5,
    lifetimeMultiplier: 0.4,  // short burst
    spawnRateMultiplier: 3.0,
    noiseAmplitude: 0.8,
  },

  // Calm ambient drift (grey/silver tones, gentle)
  neutral: {
    colors: [
      [0.7, 0.7, 0.75],   // silver
      [0.5, 0.55, 0.6],   // grey
      [0.8, 0.82, 0.85],  // light silver
    ],
    speed: 0.08,
    direction: [0, 0.3],  // slight upward drift
    spread: Math.PI * 0.9,
    sizeMultiplier: 0.7,
    lifetimeMultiplier: 2.0,  // float around longer
    spawnRateMultiplier: 0.4,
    noiseAmplitude: 0.6,  // gentle organic sway
  },
};

/**
 * Linearly interpolate between two EmotionProfileConfigs.
 * Used for morph-in-place transitions when emotion changes.
 * Colors are lerped per-channel. Scalars are lerped directly.
 *
 * @param a - Source profile (t = 0)
 * @param b - Target profile (t = 1)
 * @param t - Interpolation factor, clamped to [0, 1]
 */
export function lerpProfile(
  a: EmotionProfileConfig,
  b: EmotionProfileConfig,
  t: number,
): EmotionProfileConfig {
  const clamped = Math.max(0, Math.min(1, t));

  // Lerp colors: match lengths by padding shorter array with its last color
  const maxColors = Math.max(a.colors.length, b.colors.length);
  const colors: [number, number, number][] = [];
  for (let i = 0; i < maxColors; i++) {
    const ac = a.colors[Math.min(i, a.colors.length - 1)];
    const bc = b.colors[Math.min(i, b.colors.length - 1)];
    colors.push([
      ac[0] + (bc[0] - ac[0]) * clamped,
      ac[1] + (bc[1] - ac[1]) * clamped,
      ac[2] + (bc[2] - ac[2]) * clamped,
    ]);
  }

  return {
    colors,
    speed: a.speed + (b.speed - a.speed) * clamped,
    direction: [
      a.direction[0] + (b.direction[0] - a.direction[0]) * clamped,
      a.direction[1] + (b.direction[1] - a.direction[1]) * clamped,
    ],
    spread: a.spread + (b.spread - a.spread) * clamped,
    sizeMultiplier: a.sizeMultiplier + (b.sizeMultiplier - a.sizeMultiplier) * clamped,
    lifetimeMultiplier: a.lifetimeMultiplier + (b.lifetimeMultiplier - a.lifetimeMultiplier) * clamped,
    spawnRateMultiplier: a.spawnRateMultiplier + (b.spawnRateMultiplier - a.spawnRateMultiplier) * clamped,
    noiseAmplitude: a.noiseAmplitude + (b.noiseAmplitude - a.noiseAmplitude) * clamped,
  };
}

/**
 * Blend multiple emotion profiles weighted by their scores.
 * Takes EmotionScores (all 5 values summing to ~1) and produces
 * a single blended profile. Used when multiple emotions are active.
 *
 * For colors: weighted average of each profile's colors (per channel).
 * For direction: weighted sum then normalized (zero-length stays zero).
 * For scalars: weighted sum.
 */
export function blendProfiles(scores: EmotionScores): EmotionProfileConfig {
  const emotions = Object.keys(scores) as EmotionType[];

  // Weighted scalar blend helper
  const blendScalar = (getter: (p: EmotionProfileConfig) => number): number =>
    emotions.reduce((sum, emo) => sum + scores[emo] * getter(EMOTION_PROFILES[emo]), 0);

  // Blend colors: weighted average of all profiles' colors, per slot, per channel
  const maxColors = Math.max(
    ...emotions.map((emo) => EMOTION_PROFILES[emo].colors.length),
  );
  const colors: [number, number, number][] = [];
  for (let i = 0; i < maxColors; i++) {
    let r = 0, g = 0, b = 0;
    for (const emo of emotions) {
      const profile = EMOTION_PROFILES[emo];
      const c = profile.colors[Math.min(i, profile.colors.length - 1)];
      const w = scores[emo];
      r += c[0] * w;
      g += c[1] * w;
      b += c[2] * w;
    }
    colors.push([r, g, b]);
  }

  // Blend direction then normalize
  let dx = blendScalar((p) => p.direction[0]);
  let dy = blendScalar((p) => p.direction[1]);
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0.001) {
    dx /= len;
    dy /= len;
  }

  return {
    colors,
    speed: blendScalar((p) => p.speed),
    direction: [dx, dy],
    spread: blendScalar((p) => p.spread),
    sizeMultiplier: blendScalar((p) => p.sizeMultiplier),
    lifetimeMultiplier: blendScalar((p) => p.lifetimeMultiplier),
    spawnRateMultiplier: blendScalar((p) => p.spawnRateMultiplier),
    noiseAmplitude: blendScalar((p) => p.noiseAmplitude),
  };
}
