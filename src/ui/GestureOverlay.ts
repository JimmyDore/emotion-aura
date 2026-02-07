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
  private prevGesture: GestureType | null = null;

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
   * Update the overlay with the latest gesture.
   * Skips DOM writes when gesture has not changed.
   */
  update(gesture: GestureType): void {
    if (gesture === this.prevGesture) return;

    this.label.textContent = GESTURE_LABELS[gesture];
    this.prevGesture = gesture;

    // Toggle active class for visibility styling
    if (gesture !== 'none') {
      this.root.classList.add('gesture-overlay--active');
    } else {
      this.root.classList.remove('gesture-overlay--active');
    }
  }

  /**
   * Remove overlay from the DOM. Call during HMR cleanup.
   */
  dispose(): void {
    this.root.remove();
  }
}
