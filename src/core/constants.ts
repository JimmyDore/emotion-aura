import type { BlendshapeWeight } from './types.ts';

/**
 * MediaPipe model URLs (Google Storage CDN, float16 variants for smaller download).
 */
export const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

export const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

/**
 * MediaPipe WASM runtime CDN.
 * Pinned to 0.10.32 to prevent version mismatch between JS and WASM.
 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';

/**
 * Camera constraints for getUserMedia.
 * 640x480 at 30fps is optimal: low enough for MediaPipe (which downscales anyway),
 * high enough for a clear mirrored feed.
 */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
  },
  audio: false,
};

/**
 * Cap pixel ratio to avoid excessive GPU load on high-DPI displays.
 */
export const MAX_PIXEL_RATIO = 2;

/** EMA smoothing factor. 0.2 gives ~1-1.5 second transition at 30fps. */
export const EMA_ALPHA = 0.2;

/** Faster decay alpha when face is lost -- respond quicker to absence. */
export const EMA_ALPHA_FACE_LOST = 0.3;

/**
 * Emotion-to-blendshape weighted mappings.
 * Based on FACS (Facial Action Coding System) action unit correlations.
 * Weights within each emotion sum to 1.0.
 * All values are tunable -- adjust here, not in classifier logic.
 */
export const EMOTION_WEIGHTS: Record<string, BlendshapeWeight[]> = {
  happy: [
    { name: 'mouthSmileLeft', weight: 0.35 },
    { name: 'mouthSmileRight', weight: 0.35 },
    { name: 'cheekSquintLeft', weight: 0.15 },
    { name: 'cheekSquintRight', weight: 0.15 },
  ],
  sad: [
    { name: 'browDownLeft', weight: 0.15 },
    { name: 'browDownRight', weight: 0.15 },
    { name: 'browInnerUp', weight: 0.08 },
    { name: 'mouthFrownLeft', weight: 0.10 },
    { name: 'mouthFrownRight', weight: 0.10 },
    { name: 'mouthShrugLower', weight: 0.25 },
    { name: 'mouthPucker', weight: 0.10 },
    { name: 'eyeSquintLeft', weight: 0.035 },
    { name: 'eyeSquintRight', weight: 0.035 },
  ],
  angry: [
    { name: 'browDownLeft', weight: 0.20 },
    { name: 'browDownRight', weight: 0.20 },
    { name: 'noseSneerLeft', weight: 0.20 },
    { name: 'noseSneerRight', weight: 0.20 },
    { name: 'mouthFrownLeft', weight: 0.10 },
    { name: 'mouthFrownRight', weight: 0.10 },
  ],
  surprised: [
    { name: 'jawOpen', weight: 0.25 },
    { name: 'eyeWideLeft', weight: 0.175 },
    { name: 'eyeWideRight', weight: 0.175 },
    { name: 'browInnerUp', weight: 0.133 },
    { name: 'browOuterUpLeft', weight: 0.133 },
    { name: 'browOuterUpRight', weight: 0.134 },
  ],
};

/** Multiplier for neutral score derivation: neutral = max(0, 1 - maxEmotionScore * this).
 * Higher values make neutral less dominant, letting emotions win at lower scores.
 * At 3.5: an emotion score of ~0.22 starts beating neutral (more vivid emotion colors). */
export const NEUTRAL_SUPPRESSION_FACTOR = 3.5;

// ── Particle System ──────────────────────────────────────────────────
/** Maximum particle count for the pre-allocated pool. */
export const MAX_PARTICLES = 3000;

/** Base spawn rate (particles/second) before emotion intensity scaling. */
export const SPAWN_RATE_BASE = 80;

/** Maximum spawn rate at full intensity. */
export const SPAWN_RATE_MAX = 250;

/** Base particle lifetime in seconds. */
export const PARTICLE_LIFETIME_BASE = 3.5;

/** Base particle size in pixels (before pixel ratio scaling). */
export const PARTICLE_SIZE_BASE = 35;

/** FPS threshold below which quality scaling activates. */
export const QUALITY_FPS_THRESHOLD = 30;

/** Duration in seconds FPS must stay below threshold before scaling down. */
export const QUALITY_SCALE_DELAY = 1.0;

/** Minimum particle count (floor for quality scaling). */
export const QUALITY_MIN_PARTICLES = 300;

// ── Gesture Detection ───────────────────────────────────────────────
/** Milliseconds a gesture must persist before activating (GES-06). */
export const GESTURE_STABILITY_MS = 150;

/** Milliseconds for gesture force to decay after hand leaves frame. */
export const GESTURE_DECAY_MS = 300;

/** Influence radius in pixels (converted to scene units dynamically). */
export const GESTURE_INFLUENCE_PX = 300;

/** Force field strengths (scene units/sec^2). Tunable. */
export const FORCE_PUSH_STRENGTH = 50.0;
export const FORCE_ATTRACT_STRENGTH = 30.0;
