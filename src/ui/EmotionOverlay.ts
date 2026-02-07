import type { EmotionResult, EmotionType } from '../core/types.ts';

/**
 * Emotion color palette for the intensity bar.
 * Each emotion maps to a distinct, recognizable color.
 */
const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#F59E0B',
  sad: '#3B82F6',
  angry: '#EF4444',
  surprised: '#A855F7',
  neutral: '#9CA3AF',
};

/**
 * Minimal HUD overlay showing real-time emotion detection feedback.
 *
 * Renders a compact panel in the top-right corner with:
 * - Face detection indicator (green dot = face detected, gray = no face)
 * - Dominant emotion label (capitalized)
 * - Intensity bar (width and color reflect emotion strength)
 *
 * DOM writes are minimized: only updated when values actually change
 * to avoid unnecessary reflows at 60fps.
 */
export class EmotionOverlay {
  private root: HTMLDivElement;
  private dot: HTMLDivElement;
  private label: HTMLSpanElement;
  private bar: HTMLDivElement;

  /** Cached previous values to skip redundant DOM writes. */
  private prevDominant: EmotionType | null = null;
  private prevIntensity = -1;
  private prevFaceDetected: boolean | null = null;

  constructor(container: HTMLElement) {
    // Root panel
    this.root = document.createElement('div');
    this.root.className = 'emotion-overlay';

    // Header row: dot + label
    const header = document.createElement('div');
    header.className = 'emotion-overlay__header';

    this.dot = document.createElement('div');
    this.dot.className = 'emotion-overlay__dot';

    this.label = document.createElement('span');
    this.label.className = 'emotion-overlay__label';
    this.label.textContent = 'neutral';

    header.appendChild(this.dot);
    header.appendChild(this.label);

    // Intensity bar track + fill
    const barTrack = document.createElement('div');
    barTrack.className = 'emotion-overlay__bar-track';

    this.bar = document.createElement('div');
    this.bar.className = 'emotion-overlay__bar-fill';
    this.bar.style.width = '0%';
    this.bar.style.backgroundColor = EMOTION_COLORS.neutral;

    barTrack.appendChild(this.bar);

    this.root.appendChild(header);
    this.root.appendChild(barTrack);
    container.appendChild(this.root);
  }

  /**
   * Update overlay with latest emotion result.
   * Skips DOM writes when values have not changed to minimize reflows.
   */
  update(result: EmotionResult): void {
    // Update face detection indicator
    if (result.faceDetected !== this.prevFaceDetected) {
      this.dot.classList.toggle('emotion-overlay__dot--active', result.faceDetected);
      this.prevFaceDetected = result.faceDetected;
    }

    // Update emotion label
    if (result.dominant !== this.prevDominant) {
      this.label.textContent = result.dominant;
      this.prevDominant = result.dominant;
    }

    // Update intensity bar (quantize to 1% steps to avoid micro-updates)
    const quantized = Math.round(result.intensity * 100);
    if (quantized !== this.prevIntensity) {
      this.bar.style.width = `${quantized}%`;
      this.prevIntensity = quantized;
    }

    // Update bar color when emotion changes
    if (result.dominant !== this.prevDominant || this.bar.style.backgroundColor !== EMOTION_COLORS[result.dominant]) {
      this.bar.style.backgroundColor = EMOTION_COLORS[result.dominant];
    }
  }

  /** Expose root element for external toggle control. */
  getRoot(): HTMLDivElement {
    return this.root;
  }

  /**
   * Remove overlay from the DOM. Call during HMR cleanup.
   */
  dispose(): void {
    this.root.remove();
  }
}
