import type { GestureType } from '../core/types.ts';

/** Display label mapping for each gesture type. */
const GESTURE_LABELS: Record<GestureType, string> = {
  push: 'Push',
  attract: 'Attract',
  none: '--',
};

/**
 * Minimal HUD overlay showing the current detected hand gesture.
 *
 * Positioned at the top-left corner, mirroring the EmotionOverlay at top-right.
 * Uses the same glassmorphic styling for visual consistency.
 *
 * DOM writes are minimized: label is only updated when the gesture changes.
 */
export class GestureOverlay {
  private root: HTMLDivElement;
  private label: HTMLSpanElement;
  private prevText = '';

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'gesture-overlay';

    this.label = document.createElement('span');
    this.label.className = 'gesture-overlay__label';
    this.label.textContent = '--';

    this.root.appendChild(this.label);
    container.appendChild(this.root);
  }

  /**
   * Update the overlay with per-hand gesture labels.
   *
   * Parameters use MediaPipe handedness convention:
   * - leftGesture: MediaPipe "Left" hand (user's RIGHT hand in mirrored view)
   * - rightGesture: MediaPipe "Right" hand (user's LEFT hand in mirrored view)
   *
   * Display swaps labels so the user sees L/R matching their own perspective.
   */
  update(leftGesture: GestureType, rightGesture: GestureType): void {
    // Swap for user perspective: MediaPipe "Right" = user's Left, MediaPipe "Left" = user's Right
    const text = `L: ${GESTURE_LABELS[rightGesture]} / R: ${GESTURE_LABELS[leftGesture]}`;
    if (text === this.prevText) return;

    this.label.textContent = text;
    this.prevText = text;

    // Toggle active class if EITHER gesture is not 'none'
    if (leftGesture !== 'none' || rightGesture !== 'none') {
      this.root.classList.add('gesture-overlay--active');
    } else {
      this.root.classList.remove('gesture-overlay--active');
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
