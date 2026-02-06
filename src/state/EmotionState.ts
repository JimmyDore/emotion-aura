import { EMA_ALPHA, EMA_ALPHA_FACE_LOST } from '../core/constants.ts';
import type { EmotionScores, EmotionResult, EmotionType } from '../core/types.ts';

/**
 * EMA-smoothed emotion state manager.
 *
 * Receives raw emotion scores each frame and applies exponential moving
 * average (EMA) smoothing for fluid transitions. When the face is lost,
 * decays toward neutral at a faster rate so the UI responds promptly
 * to absence.
 *
 * The render loop can read getCurrent() on every frame (60fps) while
 * inference only updates at video framerate (~30fps). This keeps the
 * overlay smooth between inference frames.
 */
export class EmotionState {
  private smoothed: EmotionScores = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    neutral: 1,
  };

  private faceDetected = false;

  /**
   * Smooth raw emotion scores toward current state using EMA_ALPHA.
   * Call once per inference frame when a face is detected.
   *
   * Formula: smoothed[key] += alpha * (raw[key] - smoothed[key])
   */
  update(raw: EmotionScores): EmotionResult {
    this.faceDetected = true;
    const alpha = EMA_ALPHA;

    for (const key of Object.keys(this.smoothed) as EmotionType[]) {
      this.smoothed[key] += alpha * (raw[key] - this.smoothed[key]);
    }

    return this.getResult();
  }

  /**
   * Decay smoothed scores toward neutral when face is lost.
   * Uses EMA_ALPHA_FACE_LOST (faster) so the UI responds promptly.
   *
   * Target: { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 1 }
   */
  decayToNeutral(): EmotionResult {
    this.faceDetected = false;
    const alpha = EMA_ALPHA_FACE_LOST;

    const neutralTarget: EmotionScores = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 1,
    };

    for (const key of Object.keys(this.smoothed) as EmotionType[]) {
      this.smoothed[key] += alpha * (neutralTarget[key] - this.smoothed[key]);
    }

    return this.getResult();
  }

  /**
   * Read the current smoothed state without modifying it.
   * Safe to call every render frame (60fps).
   */
  getCurrent(): EmotionResult {
    return this.getResult();
  }

  /**
   * Find the emotion with the highest smoothed score.
   */
  private extractDominant(): { dominant: EmotionType; intensity: number } {
    let dominant: EmotionType = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(this.smoothed)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion as EmotionType;
      }
    }

    return { dominant, intensity: Math.min(1, maxScore) };
  }

  /**
   * Assemble an EmotionResult snapshot from current smoothed state.
   */
  private getResult(): EmotionResult {
    const { dominant, intensity } = this.extractDominant();
    return {
      dominant,
      intensity,
      scores: { ...this.smoothed },
      faceDetected: this.faceDetected,
    };
  }
}
