import type { LoadProgress } from '../core/types.ts';
import { FACE_MODEL_URL, HAND_MODEL_URL } from '../core/constants.ts';

/** Estimated model sizes in bytes (used when Content-Length header is missing). */
const FACE_MODEL_ESTIMATED_BYTES = 5 * 1024 * 1024; // ~5 MB
const HAND_MODEL_ESTIMATED_BYTES = 4 * 1024 * 1024; // ~4 MB

/** Face model accounts for ~55% of combined download weight, hand model ~45%. */
const FACE_WEIGHT = 0.55;

/**
 * Downloads MediaPipe model files via Fetch with ReadableStream progress tracking.
 * Reports byte-level progress through callbacks for real-time UI updates.
 */
export class ModelLoader {
  private faceModelBuffer: Uint8Array | null = null;
  private handModelBuffer: Uint8Array | null = null;

  /**
   * Download a single model file with progress tracking via ReadableStream.
   */
  private async fetchWithProgress(
    url: string,
    label: string,
    estimatedBytes: number,
    onProgress: (progress: LoadProgress) => void,
  ): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : estimatedBytes;
    const hasContentLength = contentLength !== null;

    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: no ReadableStream support, read entire response at once
      const buffer = new Uint8Array(await response.arrayBuffer());
      onProgress({ loaded: buffer.byteLength, total: buffer.byteLength, percent: 100, label });
      return buffer;
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.byteLength;

      // Calculate percent: if Content-Length is known, use real value.
      // Otherwise cap at 95% until stream is finished.
      const percent = hasContentLength
        ? Math.round((loaded / total) * 100)
        : Math.min(95, Math.round((loaded / total) * 100));

      onProgress({ loaded, total, percent, label });
    }

    // Final progress: ensure 100% is reported
    onProgress({ loaded, total: loaded, percent: 100, label });

    // Concatenate chunks into a single Uint8Array
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return result;
  }

  /**
   * Download both face and hand models sequentially.
   * Face model is downloaded first (needed earlier in Phase 2).
   * Combined progress: face = 0-55%, hand = 55-100%.
   */
  async loadAll(onProgress: (progress: LoadProgress) => void): Promise<void> {
    // Download face model (0% - 55%)
    this.faceModelBuffer = await this.fetchWithProgress(
      FACE_MODEL_URL,
      'Downloading face detection model...',
      FACE_MODEL_ESTIMATED_BYTES,
      (progress) => {
        onProgress({
          loaded: progress.loaded,
          total: progress.total,
          percent: Math.round(progress.percent * FACE_WEIGHT),
          label: progress.label,
        });
      },
    );

    // Download hand model (55% - 100%)
    this.handModelBuffer = await this.fetchWithProgress(
      HAND_MODEL_URL,
      'Downloading hand tracking model...',
      HAND_MODEL_ESTIMATED_BYTES,
      (progress) => {
        onProgress({
          loaded: progress.loaded,
          total: progress.total,
          percent: Math.round(FACE_WEIGHT * 100 + progress.percent * (1 - FACE_WEIGHT)),
          label: progress.label,
        });
      },
    );
  }

  /** Get the downloaded face model buffer, or null if not yet loaded. */
  getFaceModelBuffer(): Uint8Array | null {
    return this.faceModelBuffer;
  }

  /** Get the downloaded hand model buffer, or null if not yet loaded. */
  getHandModelBuffer(): Uint8Array | null {
    return this.handModelBuffer;
  }
}

export default ModelLoader;
