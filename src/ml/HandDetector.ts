import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * Wrapper around MediaPipe HandLandmarker for per-frame hand detection
 * in VIDEO running mode.
 *
 * Usage:
 *   const detector = new HandDetector();
 *   await detector.init(modelBuffer, wasmCdnPath);
 *   const result = detector.detect(videoElement);
 *
 * Configured for dual-hand detection (numHands: 2) to enable
 * two-handed gesture interactions in the staggered face/hand pipeline.
 */
export class HandDetector {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  /**
   * Initialize HandLandmarker from a pre-downloaded model buffer.
   *
   * Calls FilesetResolver.forVisionTasks() independently of FaceDetector.
   * The WASM CDN URL is identical -- browser HTTP cache serves it instantly
   * on the second load. No benefit to sharing the WasmFileset instance
   * between detectors (adds coupling for zero gain).
   */
  async init(modelBuffer: Uint8Array, wasmCdnPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmCdnPath);

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: modelBuffer,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  /**
   * Run hand detection on the current video frame.
   *
   * Returns null if:
   * - Landmarker is not initialized (init() not called)
   * - Video frame has not changed since last detection (stale frame)
   *
   * Stale frame detection prevents duplicate inference when the render loop
   * (60fps) outpaces the video stream (30fps).
   */
  detect(video: HTMLVideoElement): HandLandmarkerResult | null {
    if (!this.landmarker) return null;
    if (video.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = video.currentTime;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  /**
   * Release the HandLandmarker resources. Call during HMR cleanup
   * or when the detector is no longer needed.
   */
  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
