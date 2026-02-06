import type { Category } from '@mediapipe/tasks-vision';
import { EMOTION_WEIGHTS, NEUTRAL_SUPPRESSION_FACTOR } from '../core/constants.ts';
import type { EmotionScores, EmotionType } from '../core/types.ts';

/**
 * Stateless classifier that converts MediaPipe blendshape categories
 * into emotion scores using weighted sums from EMOTION_WEIGHTS.
 *
 * No smoothing is applied here -- that responsibility belongs to
 * EmotionState (Plan 02). This keeps classification pure and testable.
 *
 * IMPORTANT: Blendshapes are always looked up by categoryName, never by
 * array index. Index 0 is `_neutral` (53 total items), so index-based
 * access would produce incorrect mappings.
 */
export class EmotionClassifier {
  /**
   * Classify blendshape categories into 5 emotion scores.
   *
   * Computes a weighted sum for each emotion using the blendshape weights
   * defined in constants.ts. Neutral is derived as the inverse of the
   * strongest emotion score.
   *
   * @param categories - MediaPipe blendshape categories from
   *   FaceLandmarkerResult.faceBlendshapes[0].categories
   * @returns Scores for all 5 emotions (happy, sad, angry, surprised, neutral),
   *   each in the 0-1 range. Intensity scales with expression strength.
   */
  classify(categories: Category[]): EmotionScores {
    // Build lookup map for O(1) access by categoryName
    const blendshapeMap = new Map<string, number>();
    for (const cat of categories) {
      blendshapeMap.set(cat.categoryName, cat.score);
    }
    const get = (name: string): number => blendshapeMap.get(name) ?? 0;

    // Compute weighted sum for each emotion
    let happy = 0;
    for (const bw of EMOTION_WEIGHTS.happy) {
      happy += get(bw.name) * bw.weight;
    }

    let sad = 0;
    for (const bw of EMOTION_WEIGHTS.sad) {
      sad += get(bw.name) * bw.weight;
    }

    let angry = 0;
    for (const bw of EMOTION_WEIGHTS.angry) {
      angry += get(bw.name) * bw.weight;
    }

    let surprised = 0;
    for (const bw of EMOTION_WEIGHTS.surprised) {
      surprised += get(bw.name) * bw.weight;
    }

    // Disambiguation: browDown is shared between angry and sad.
    // Use secondary signals to differentiate.
    const browDownAvg = (get('browDownLeft') + get('browDownRight')) / 2;
    const noseSneerAvg = (get('noseSneerLeft') + get('noseSneerRight')) / 2;
    const chinCrumple = get('mouthShrugLower');

    // When brows are down with no nose sneer: use chin crumple as tiebreaker.
    // High chin crumple (>0.3) = sad pout. Low chin crumple = angry tension.
    if (browDownAvg > 0.4 && noseSneerAvg < 0.1) {
      if (chinCrumple > 0.3) {
        sad *= 1.5;
        angry *= 0.6;
      }
    }

    // Strong nose sneer always favors angry over sad
    if (noseSneerAvg > 0.2) {
      sad *= 0.5;
    }

    // Neutral is the inverse: high when all emotions are low
    const maxEmotionScore = Math.max(happy, sad, angry, surprised);
    const neutral = Math.max(0, 1 - maxEmotionScore * NEUTRAL_SUPPRESSION_FACTOR);

    return { happy, sad, angry, surprised, neutral };
  }

  /**
   * Extract the dominant emotion and its intensity from a scores object.
   *
   * @param scores - Emotion scores (raw or smoothed)
   * @returns The emotion with the highest score and its intensity (clamped to 0-1)
   */
  extractDominant(scores: EmotionScores): { dominant: EmotionType; intensity: number } {
    let dominant: EmotionType = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion as EmotionType;
      }
    }

    return { dominant, intensity: Math.min(1, maxScore) };
  }
}
