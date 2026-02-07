import type { GestureType, GestureResult } from '../core/types.ts';
import { GESTURE_STABILITY_MS, GESTURE_DECAY_MS } from '../core/constants.ts';

/**
 * Gesture stability state machine.
 *
 * Implements two key behaviors:
 * 1. **Stability timer (150ms):** A raw gesture must persist for
 *    GESTURE_STABILITY_MS before it becomes the active gesture.
 *    This prevents flicker during hand transitions.
 *
 * 2. **Decay on hand loss (300ms):** When the hand leaves the frame,
 *    the gesture force decays linearly from 1 to 0 over GESTURE_DECAY_MS.
 *    This gives a smooth wind-down instead of an abrupt stop.
 *
 * Usage: call update() each frame with raw classifier output.
 * Call getCurrent() on frames where no new hand data is available.
 */
export class GestureState {
  private currentGesture: GestureType = 'none';
  private pendingGesture: GestureType = 'none';
  private pendingTimer = 0; // ms accumulated
  private handPresent = false;
  private decayTimer = 0; // ms accumulated
  private lastHandPosition: { x: number; y: number } | null = null;
  private lastResult: GestureResult = {
    gesture: 'none',
    active: false,
    strength: 0,
    handPosition: null,
  };

  /**
   * Process a new frame of gesture data.
   *
   * @param rawGesture - The gesture classified from current hand landmarks.
   * @param handDetected - Whether a hand was detected this frame.
   * @param handPosition - Normalized palm center position, or null if no hand.
   * @param dt - Delta time in seconds since last frame.
   * @returns The current gesture result after applying stability and decay.
   */
  update(
    rawGesture: GestureType,
    handDetected: boolean,
    handPosition: { x: number; y: number } | null,
    dt: number,
  ): GestureResult {
    if (handDetected) {
      this.handPresent = true;
      this.decayTimer = 0;
      this.lastHandPosition = handPosition;

      // Stability logic: gesture must persist for GESTURE_STABILITY_MS
      if (rawGesture !== this.pendingGesture) {
        // New gesture detected -- reset stability timer
        this.pendingGesture = rawGesture;
        this.pendingTimer = 0;
      } else {
        // Same gesture -- accumulate time
        this.pendingTimer += dt * 1000;
      }

      if (this.pendingTimer >= GESTURE_STABILITY_MS) {
        this.currentGesture = this.pendingGesture;
      }

      this.lastResult = {
        gesture: this.currentGesture,
        active: this.currentGesture !== 'none',
        strength: 1,
        handPosition: this.lastHandPosition,
      };
    } else {
      // Hand not detected -- enter or continue decay
      if (this.handPresent) {
        // Just lost the hand -- start decay
        this.handPresent = false;
        this.decayTimer = 0;
      }

      this.decayTimer += dt * 1000;
      const decayProgress = Math.min(1, this.decayTimer / GESTURE_DECAY_MS);
      const strength = 1 - decayProgress;

      if (decayProgress >= 1) {
        // Decay complete -- fully reset
        this.currentGesture = 'none';
        this.pendingGesture = 'none';
        this.pendingTimer = 0;
      }

      this.lastResult = {
        gesture: this.currentGesture,
        active: strength > 0,
        strength,
        handPosition: this.lastHandPosition,
      };
    }

    return this.lastResult;
  }

  /**
   * Read the last computed gesture result without modifying state.
   * Use on frames where no new hand data arrives (e.g., staggered inference).
   */
  getCurrent(): GestureResult {
    return this.lastResult;
  }

  /**
   * Reset all state to initial values.
   * Call during cleanup or when restarting the gesture pipeline.
   */
  reset(): void {
    this.currentGesture = 'none';
    this.pendingGesture = 'none';
    this.pendingTimer = 0;
    this.handPresent = false;
    this.decayTimer = 0;
    this.lastHandPosition = null;
    this.lastResult = {
      gesture: 'none',
      active: false,
      strength: 0,
      handPosition: null,
    };
  }
}
