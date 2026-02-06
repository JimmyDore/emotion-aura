import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * Wrapper around MediaPipe FaceLandmarker for per-frame face detection
 * with blendshape output.
 *
 * Usage:
 *   const detector = new FaceDetector();
 *   await detector.init(modelBuffer, wasmCdnPath);
 *   const result = detector.detect(videoElement);
 *
 * IMPORTANT: Blendshape categories include `_neutral` at index 0 (53 total).
 * Always look up blendshapes by `categoryName`, never by array index.
 */
export class FaceDetector {
  private landmarker: FaceLandmarker | null = null;
  private lastVideoTime = -1;

  /**
   * Initialize FaceLandmarker from a pre-downloaded model buffer.
   *
   * Uses createFromOptions (NOT createFromModelBuffer) because only
   * createFromOptions allows setting outputFaceBlendshapes: true.
   */
  async init(modelBuffer: Uint8Array, wasmCdnPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmCdnPath);

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: modelBuffer,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  }

  /**
   * Run face detection on the current video frame.
   *
   * Returns null if:
   * - Landmarker is not initialized (init() not called)
   * - Video frame has not changed since last detection (stale frame)
   *
   * Stale frame detection prevents duplicate inference when the render loop
   * (60fps) outpaces the video stream (30fps).
   */
  detect(video: HTMLVideoElement): FaceLandmarkerResult | null {
    if (!this.landmarker) return null;
    if (video.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = video.currentTime;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  /**
   * Release the FaceLandmarker resources. Call during HMR cleanup
   * or when the detector is no longer needed.
   */
  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
