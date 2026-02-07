import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { GestureType } from '../core/types.ts';

/**
 * Rule-based gesture classifier from 21 hand landmarks.
 *
 * Uses finger-curl detection (TIP vs PIP y-position) to classify
 * hand pose: fist (attract) or open hand (push).
 *
 * MediaPipe hand landmark indices:
 *  - WRIST: 0
 *  - INDEX_FINGER_PIP: 6, INDEX_FINGER_TIP: 8
 *  - MIDDLE_FINGER_MCP: 9, MIDDLE_FINGER_PIP: 10, MIDDLE_FINGER_TIP: 12
 *  - RING_FINGER_PIP: 14, RING_FINGER_TIP: 16
 *  - PINKY_PIP: 18, PINKY_TIP: 20
 */

/**
 * Classify a hand gesture from normalized hand landmarks.
 *
 * @param landmarks - 21 MediaPipe hand landmarks in normalized [0,1] coordinates.
 *   y increases downward (screen space).
 * @returns The detected gesture type.
 */
export function classifyGesture(landmarks: NormalizedLandmark[]): GestureType {
  // Finger curl detection: TIP below PIP = curled (MediaPipe y-down)
  const indexCurled = landmarks[8].y > landmarks[6].y;
  const middleCurled = landmarks[12].y > landmarks[10].y;
  const ringCurled = landmarks[16].y > landmarks[14].y;
  const pinkyCurled = landmarks[20].y > landmarks[18].y;

  // Fist (attract): all four fingers curled
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
    return 'attract';
  }

  // Open hand (push): no fingers curled
  if (!indexCurled && !middleCurled && !ringCurled && !pinkyCurled) {
    return 'push';
  }

  // Ambiguous hand pose
  return 'none';
}

/**
 * Compute the palm center as the midpoint of WRIST and MIDDLE_FINGER_MCP.
 *
 * @param landmarks - 21 MediaPipe hand landmarks in normalized [0,1] coordinates.
 * @returns Palm center in normalized coordinates.
 */
export function getPalmCenter(
  landmarks: NormalizedLandmark[],
): { x: number; y: number } {
  return {
    x: (landmarks[0].x + landmarks[9].x) / 2,
    y: (landmarks[0].y + landmarks[9].y) / 2,
  };
}
