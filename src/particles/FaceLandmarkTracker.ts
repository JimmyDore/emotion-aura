import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Converts MediaPipe face landmarks to Three.js scene coordinates
 * for particle spawning.
 *
 * Uses the nose tip landmark (index 1) as the face center -- it's the
 * most stable point on the face mesh. Applies EMA smoothing to prevent
 * jitter from frame-to-frame landmark noise.
 *
 * Coordinate conversion:
 *   - MediaPipe: x=[0,1] left-to-right, y=[0,1] top-to-bottom
 *   - Scene (ortho): x=[-aspect, aspect], y=[-1, 1]
 *   - Webcam is mirrored (scaleX(-1)), so scene x must negate
 */
export class FaceLandmarkTracker {
  /** EMA smoothing factor. Lower = smoother but more latent. */
  private static readonly SMOOTH_ALPHA = 0.3;

  /** Index of the nose tip landmark in MediaPipe's 478-point face mesh. */
  private static readonly NOSE_TIP_INDEX = 1;

  /** Smoothed face position in scene coordinates. Null if no prior data. */
  private smoothedPos: { x: number; y: number } | null = null;

  /**
   * Update with the latest face landmarks and return the smoothed
   * scene-space face center position.
   *
   * @param faceLandmarks - The first face's landmark array from FaceLandmarker result,
   *                        or undefined if no face detected.
   * @param aspect - Viewport aspect ratio (width / height) for coordinate mapping.
   * @returns Smoothed {x, y} in scene coordinates, or null if no face data.
   */
  update(
    faceLandmarks: NormalizedLandmark[] | undefined,
    aspect: number,
  ): { x: number; y: number } | null {
    if (!faceLandmarks || faceLandmarks.length === 0) {
      return null;
    }

    const landmark = faceLandmarks[FaceLandmarkTracker.NOSE_TIP_INDEX];
    if (!landmark) return null;

    // Convert MediaPipe normalized coordinates to orthographic scene coords
    // MediaPipe: x=0 left, x=1 right, y=0 top, y=1 bottom
    // Webcam is mirrored (scaleX(-1)), so scene x must also mirror (negate)
    const rawX = -(landmark.x * 2 - 1) * aspect;
    const rawY = -(landmark.y * 2 - 1);

    // Apply EMA smoothing
    if (this.smoothedPos === null) {
      // First frame: initialize directly (no smoothing on first observation)
      this.smoothedPos = { x: rawX, y: rawY };
    } else {
      const alpha = FaceLandmarkTracker.SMOOTH_ALPHA;
      this.smoothedPos.x += alpha * (rawX - this.smoothedPos.x);
      this.smoothedPos.y += alpha * (rawY - this.smoothedPos.y);
    }

    return { x: this.smoothedPos.x, y: this.smoothedPos.y };
  }

  /** Clear stored position. Call when face is lost to reset smoothing. */
  reset(): void {
    this.smoothedPos = null;
  }
}
