import type { WinkEvent } from '../core/types.ts';
import { WINK_THRESHOLD, WINK_COOLDOWN_MS } from '../core/constants.ts';

/**
 * Detects eye winks and blinks from MediaPipe FaceLandmarker blendshape scores.
 *
 * Each eye is tracked independently with its own cooldown timer.
 * - Left eye closed  -> WinkEvent { side: 'left' }
 * - Right eye closed -> WinkEvent { side: 'right' }
 * - Both eyes closed -> Two WinkEvents (one per side)
 *
 * No asymmetry check or blink filtering is applied.
 * Blinks are a feature (double firework), not noise.
 */
export class WinkDetector {
  private lastLeftTrigger: number = 0;
  private lastRightTrigger: number = 0;

  /**
   * Process blendshape categories and return any wink/blink events.
   *
   * @param categories - MediaPipe blendshape categories from
   *   FaceLandmarkerResult.faceBlendshapes[0].categories
   * @param now - Current timestamp in milliseconds (performance.now())
   * @returns Array of 0, 1, or 2 WinkEvents (2 = both eyes closed = blink)
   */
  update(
    categories: Array<{ categoryName: string; score: number }>,
    now: number,
  ): WinkEvent[] {
    // Build lookup map for O(1) access by categoryName
    const blendshapeMap = new Map<string, number>();
    for (const cat of categories) {
      blendshapeMap.set(cat.categoryName, cat.score);
    }
    const get = (name: string): number => blendshapeMap.get(name) ?? 0;

    const leftScore = get('eyeBlinkLeft');
    const rightScore = get('eyeBlinkRight');

    const leftClosed = leftScore >= WINK_THRESHOLD;
    const rightClosed = rightScore >= WINK_THRESHOLD;

    const events: WinkEvent[] = [];

    if (leftClosed && (now - this.lastLeftTrigger) >= WINK_COOLDOWN_MS) {
      events.push({ side: 'left', timestamp: now });
      this.lastLeftTrigger = now;
    }

    if (rightClosed && (now - this.lastRightTrigger) >= WINK_COOLDOWN_MS) {
      events.push({ side: 'right', timestamp: now });
      this.lastRightTrigger = now;
    }

    return events;
  }
}
