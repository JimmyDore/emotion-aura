/**
 * Camera error types with user-facing messages and recovery guidance.
 * Used by CameraManager (Plan 01-02) and ErrorScreen UI.
 */
export interface CameraError {
  type: 'denied' | 'not-found' | 'in-use' | 'overconstrained' | 'security' | 'unknown';
  message: string;
  recoveryHint: string;
}

/**
 * Progress tracking for model downloads.
 * Used by ModelLoader (Plan 01-02) and LoadingScreen UI.
 */
export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
  label: string;
}

/**
 * Application state machine.
 * Drives which UI screen is visible at any given time.
 */
export type AppState = 'permission' | 'loading' | 'error' | 'live' | 'mobile-gate';

/** The 5 emotion categories detected from facial expressions. */
export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';

/** Raw or smoothed scores for each emotion (0-1 range). */
export type EmotionScores = Record<EmotionType, number>;

/** Complete emotion result for a single frame. */
export interface EmotionResult {
  dominant: EmotionType;
  intensity: number;        // 0-1, strength of dominant emotion
  scores: EmotionScores;    // All 5 scores (for blending in Phase 3)
  faceDetected: boolean;
}

/** Blendshape weight definition for emotion classification. */
export interface BlendshapeWeight {
  name: string;
  weight: number;
}
