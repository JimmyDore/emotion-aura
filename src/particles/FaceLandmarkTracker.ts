import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Converts MediaPipe face landmarks to Three.js scene coordinates
 * for particle spawning.
 *
 * Returns two spawn points (left ear, right ear) so particles emanate
 * from the sides of the face and flow outward — keeping the face visible.
 * Also returns the face center for spawn-center uniform.
 *
 * Coordinate conversion:
 *   - MediaPipe: x=[0,1] left-to-right, y=[0,1] top-to-bottom
 *   - Scene (ortho): x=[-aspect, aspect], y=[-1, 1]
 *   - Webcam is mirrored (scaleX(-1)), so scene x must negate
 */

export interface FaceSpawnPoints {
  /** Face center (nose tip) for spawn-center uniform. */
  center: { x: number; y: number };
  /** Left ear spawn point (viewer's left = subject's right). */
  leftEar: { x: number; y: number };
  /** Right ear spawn point (viewer's right = subject's left). */
  rightEar: { x: number; y: number };
}

export class FaceLandmarkTracker {
  /** EMA smoothing factor. Lower = smoother but more latent. */
  private static readonly SMOOTH_ALPHA = 0.3;

  /**
   * MediaPipe 478-point face mesh landmark indices:
   *   1   = nose tip (face center)
   *   234 = right ear tragion (subject's right = viewer's left after mirror)
   *   454 = left ear tragion (subject's left = viewer's right after mirror)
   */
  private static readonly NOSE_TIP = 1;
  private static readonly RIGHT_EAR = 234;
  private static readonly LEFT_EAR = 454;

  /** Smoothed positions in scene coordinates. Null if no prior data. */
  private smoothedCenter: { x: number; y: number } | null = null;
  private smoothedLeftEar: { x: number; y: number } | null = null;
  private smoothedRightEar: { x: number; y: number } | null = null;

  /**
   * Update with the latest face landmarks and return smoothed spawn points.
   *
   * @param faceLandmarks - The first face's landmark array, or undefined.
   * @param aspect - Viewport aspect ratio (width / height).
   * @returns Smoothed spawn points, or null if no face data.
   */
  update(
    faceLandmarks: NormalizedLandmark[] | undefined,
    aspect: number,
  ): FaceSpawnPoints | null {
    if (!faceLandmarks || faceLandmarks.length === 0) {
      return null;
    }

    const nose = faceLandmarks[FaceLandmarkTracker.NOSE_TIP];
    const rEar = faceLandmarks[FaceLandmarkTracker.RIGHT_EAR];
    const lEar = faceLandmarks[FaceLandmarkTracker.LEFT_EAR];
    if (!nose || !rEar || !lEar) return null;

    // Convert each landmark to scene coordinates
    const center = this.toScene(nose, aspect);
    const leftEar = this.toScene(lEar, aspect);
    const rightEar = this.toScene(rEar, aspect);

    // Apply EMA smoothing
    this.smoothedCenter = this.smooth(this.smoothedCenter, center);
    this.smoothedLeftEar = this.smooth(this.smoothedLeftEar, leftEar);
    this.smoothedRightEar = this.smooth(this.smoothedRightEar, rightEar);

    return {
      center: { ...this.smoothedCenter },
      leftEar: { ...this.smoothedLeftEar },
      rightEar: { ...this.smoothedRightEar },
    };
  }

  /** Clear stored positions. Call when face is lost to reset smoothing. */
  reset(): void {
    this.smoothedCenter = null;
    this.smoothedLeftEar = null;
    this.smoothedRightEar = null;
  }

  /** Convert a MediaPipe normalized landmark to orthographic scene coords. */
  private toScene(lm: NormalizedLandmark, aspect: number): { x: number; y: number } {
    return {
      x: -(lm.x * 2 - 1) * aspect,  // negate for mirror
      y: -(lm.y * 2 - 1),            // flip y
    };
  }

  /** EMA smooth a position. */
  private smooth(
    prev: { x: number; y: number } | null,
    raw: { x: number; y: number },
  ): { x: number; y: number } {
    if (prev === null) return { x: raw.x, y: raw.y };
    const a = FaceLandmarkTracker.SMOOTH_ALPHA;
    return {
      x: prev.x + a * (raw.x - prev.x),
      y: prev.y + a * (raw.y - prev.y),
    };
  }
}
