import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Converts MediaPipe face landmarks to Three.js scene coordinates
 * for particle spawning from the FACE_OVAL contour.
 *
 * Returns spawn points around the full head outline so particles emanate
 * outward like an aura — not just from ear landmarks.
 * Also returns the face center for spawn-center uniform.
 *
 * Coordinate conversion:
 *   - MediaPipe: x=[0,1] left-to-right, y=[0,1] top-to-bottom
 *   - Scene (ortho): x=[-aspect, aspect], y=[-1, 1]
 *   - Webcam is mirrored (scaleX(-1)), so scene x must negate
 */

export interface FaceSpawnPoints {
  /** Face center for spawn-center uniform. */
  center: { x: number; y: number };
  /** Get a random spawn point on the face oval contour. Call once per particle spawn. */
  getRandomSpawnPoint: () => { x: number; y: number };
}

export class FaceLandmarkTracker {
  /** EMA smoothing factor. Lower = smoother but more latent. */
  private static readonly SMOOTH_ALPHA = 0.3;

  /**
   * MediaPipe 478-point face mesh FACE_OVAL contour indices (36 points).
   * Source: MediaPipe FACEMESH_FACE_OVAL (face_mesh_connections.py).
   * These define the face outline perimeter for aura-style particle spawning.
   */
  private static readonly FACE_OVAL_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ] as const;

  /** Smoothed face center in scene coordinates. Null if no prior data. */
  private smoothedCenter: { x: number; y: number } | null = null;

  /** Smoothed oval landmark positions in scene coordinates (36 points). */
  private smoothedOvalPoints: ({ x: number; y: number } | null)[] = new Array(
    FaceLandmarkTracker.FACE_OVAL_INDICES.length,
  ).fill(null);

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
    coverScaleX = 1,
    coverScaleY = 1,
  ): FaceSpawnPoints | null {
    if (!faceLandmarks || faceLandmarks.length === 0) {
      return null;
    }

    // Compute face center from the average of all FACE_OVAL landmarks
    // (more stable than nose tip for halo effect centering)
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let i = 0; i < FaceLandmarkTracker.FACE_OVAL_INDICES.length; i++) {
      const idx = FaceLandmarkTracker.FACE_OVAL_INDICES[i];
      const lm = faceLandmarks[idx];
      if (!lm) continue;

      // Convert to scene coordinates and smooth each oval point individually
      const raw = this.toScene(lm, aspect, coverScaleX, coverScaleY);
      this.smoothedOvalPoints[i] = this.smooth(
        this.smoothedOvalPoints[i],
        raw,
      );

      sumX += this.smoothedOvalPoints[i]!.x;
      sumY += this.smoothedOvalPoints[i]!.y;
      count++;
    }

    if (count === 0) return null;

    // Smooth the center
    const rawCenter = { x: sumX / count, y: sumY / count };
    this.smoothedCenter = this.smooth(this.smoothedCenter, rawCenter);

    const center = { ...this.smoothedCenter };
    const ovalPoints = this.smoothedOvalPoints;

    return {
      center,
      getRandomSpawnPoint: (): { x: number; y: number } => {
        // Pick a random FACE_OVAL landmark from the smoothed array
        const randIdx = Math.floor(Math.random() * ovalPoints.length);
        const point = ovalPoints[randIdx];
        if (point) {
          return { x: point.x, y: point.y };
        }
        // Fallback: return center if somehow the point isn't smoothed yet
        return { x: center.x, y: center.y };
      },
    };
  }

  /** Clear stored positions. Call when face is lost to reset smoothing. */
  reset(): void {
    this.smoothedCenter = null;
    this.smoothedOvalPoints = new Array(
      FaceLandmarkTracker.FACE_OVAL_INDICES.length,
    ).fill(null);
  }

  /** Convert a MediaPipe normalized landmark to orthographic scene coords. */
  private toScene(
    lm: NormalizedLandmark,
    aspect: number,
    coverScaleX: number,
    coverScaleY: number,
  ): { x: number; y: number } {
    return {
      x: -(lm.x * 2 - 1) * aspect * coverScaleX,  // negate for mirror, correct for cover crop
      y: -(lm.y * 2 - 1) * coverScaleY,            // flip y, correct for cover crop
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
