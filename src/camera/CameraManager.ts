import type { CameraError } from '../core/types.ts';
import { CAMERA_CONSTRAINTS } from '../core/constants.ts';

/**
 * Manages webcam access lifecycle: request permission, attach to video element, stop.
 * Throws typed CameraError objects for every getUserMedia failure mode.
 */
export class CameraManager {
  private stream: MediaStream | null = null;

  /**
   * Request camera access via getUserMedia.
   * On success, stores the stream and returns it.
   * On failure, throws a typed CameraError with a user-facing message and recovery hint.
   */
  async requestAccess(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      this.stream = stream;
      return stream;
    } catch (err: unknown) {
      throw CameraManager.mapError(err);
    }
  }

  /**
   * Attach the current stream to a video element and wait for metadata to load.
   * Must call requestAccess() first.
   */
  attachToVideo(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.stream) {
      throw new Error('No active stream. Call requestAccess() first.');
    }
    videoElement.srcObject = this.stream;
    return new Promise<void>((resolve) => {
      videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
    });
  }

  /**
   * Stop all tracks on the active stream and release the camera.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Map a getUserMedia error to a typed CameraError.
   */
  private static mapError(err: unknown): CameraError {
    const name = err instanceof DOMException ? err.name : '';

    switch (name) {
      case 'NotAllowedError':
        return {
          type: 'denied',
          message: 'Camera access was denied',
          recoveryHint:
            "Click the camera icon in your browser's address bar to allow access, then refresh the page.",
        };

      case 'NotFoundError':
        return {
          type: 'not-found',
          message: 'No camera detected',
          recoveryHint: 'Please connect a webcam and refresh the page.',
        };

      case 'NotReadableError':
        return {
          type: 'in-use',
          message: 'Camera is in use by another application',
          recoveryHint:
            'Close any other apps using your camera (video calls, screen recording), then try again.',
        };

      case 'OverconstrainedError':
        return {
          type: 'overconstrained',
          message: "Camera doesn't support required settings",
          recoveryHint: 'Try connecting a different camera.',
        };

      case 'SecurityError':
        return {
          type: 'security',
          message: 'Camera access requires a secure connection',
          recoveryHint: "Make sure you're accessing this page via HTTPS.",
        };

      default:
        return {
          type: 'unknown',
          message: 'An unexpected error occurred',
          recoveryHint: 'Please refresh the page and try again.',
        };
    }
  }
}

export default CameraManager;
