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
