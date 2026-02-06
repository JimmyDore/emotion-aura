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
 * At 2.5: an emotion score of ~0.30 starts beating neutral. */
export const NEUTRAL_SUPPRESSION_FACTOR = 2.5;
