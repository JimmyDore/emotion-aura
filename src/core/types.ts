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
