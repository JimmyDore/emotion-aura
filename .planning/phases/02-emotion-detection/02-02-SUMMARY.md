---
phase: 02-emotion-detection
plan: 02
subsystem: state, ui, main
tags: [ema-smoothing, emotion-overlay, pipeline-integration, human-verified]

# Dependency graph
requires:
  - phase: 02-emotion-detection
    plan: 01
    provides: "FaceDetector, EmotionClassifier, emotion types and constants"
provides:
  - "EmotionState: EMA-smoothed emotion scores with face-lost decay"
  - "EmotionOverlay: HUD showing detection indicator, emotion label, intensity bar"
  - "Full detection pipeline: FaceDetector -> EmotionClassifier -> EmotionState -> EmotionOverlay"
affects: [03-particle-system, 04-hand-gestures]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EMA smoothing with separate alpha for face-present vs face-lost"
    - "DOM overlay with dirty-checking to minimize reflows at 60fps"
    - "Stale frame skip in render loop (null result = no state change)"
    - "Threshold-based emotion disambiguation for ambiguous expressions"

key-files:
  created:
    - "src/state/EmotionState.ts"
    - "src/ui/EmotionOverlay.ts"
  modified:
    - "src/main.ts"
    - "src/style.css"
    - "src/core/constants.ts"
    - "src/ml/EmotionClassifier.ts"

key-decisions:
  - "Stale frames (null from FaceDetector) must be skipped, not treated as face-lost"
  - "NEUTRAL_SUPPRESSION_FACTOR tuned from 1.5 to 2.5 after live testing"
  - "Angry/sad disambiguation uses chin crumple (mouthShrugLower) threshold, not noseSneer (unreliable)"
  - "browDown shared between angry and sad weights; secondary signals differentiate"

patterns-established:
  - "Render loop skips state updates on stale video frames for correct inference-rate processing"
  - "Emotion weight tuning based on live webcam blendshape data, not theoretical FACS mappings"

# Metrics
duration: 8min
completed: 2026-02-06
---

# Phase 2 Plan 2: Emotion Pipeline Integration Summary

**EMA-smoothed emotion state, visual overlay HUD, and full main.ts pipeline wiring with human-verified emotion detection**

## Performance

- **Duration:** ~8 min (including checkpoint verification and bug fixing)
- **Completed:** 2026-02-06
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- EmotionState applies EMA smoothing with separate alpha for face-present (0.2) and face-lost (0.3) decay
- EmotionOverlay renders a glass-effect HUD with face detection dot, emotion label, and color-coded intensity bar
- Full pipeline wired in main.ts render loop: FaceDetector -> EmotionClassifier -> EmotionState -> EmotionOverlay
- HMR cleanup for FaceDetector and EmotionOverlay
- Human-verified all 5 emotions via live webcam testing

## Task Commits

1. **Task 1: EmotionState smoother and EmotionOverlay UI** - `8f7c711` (feat)
2. **Task 2: Wire detection pipeline into main.ts render loop** - `f8c7faa` (feat)
3. **Task 3: Human verification** - checkpoint approved after bug fixes
4. **Bug fix: Stale frame decay + emotion weight tuning** - `0fc545d` (fix)

## Files Created/Modified
- `src/state/EmotionState.ts` - EMA smoother with update(), decayToNeutral(), getCurrent()
- `src/ui/EmotionOverlay.ts` - DOM overlay with dirty-checking for minimal reflows
- `src/style.css` - Glass-effect emotion overlay styles
- `src/main.ts` - Full pipeline integration with stale frame handling
- `src/core/constants.ts` - Retuned sad weights, NEUTRAL_SUPPRESSION_FACTOR 1.5->2.5
- `src/ml/EmotionClassifier.ts` - Added threshold-based angry/sad disambiguation

## Decisions Made
- Stale video frames (where detect() returns null) must skip state updates entirely, not trigger decayToNeutral()
- NEUTRAL_SUPPRESSION_FACTOR increased from 1.5 to 2.5 so emotions register at lower blendshape scores
- Sad/angry disambiguation uses mouthShrugLower > 0.3 threshold (chin crumple = sad) instead of noseSneer (which many users don't produce)
- browDown is shared between angry and sad weights; angry gets more browDown weight (0.40 vs 0.30)

## Deviations from Plan

- **Stale frame bug**: Render loop at 60fps was calling decayToNeutral() on stale frames (~30/60), keeping emotions stuck on neutral. Fixed by guarding with `result !== null`.
- **Emotion weight tuning**: FACS-based weights needed significant adjustment after live testing. Sad required browDown in its weights (not just browInnerUp) and threshold-based disambiguation for angry/sad ambiguity.
- **NEUTRAL_SUPPRESSION_FACTOR**: Original value (1.5) was too permissive — emotions needed scores >0.45 to beat neutral. Increased to 2.5.

## Issues Encountered

- Sad detection was hardest to tune: most people push brows DOWN when sad (angry pattern in FACS), not inner brows UP (textbook sad). Required pragmatic weight redesign based on actual blendshape data.
- User's angry and sad faces produce near-identical browDown values (~0.72); disambiguation relies entirely on mouthShrugLower threshold.

## User Setup Required

None.

## Next Phase Readiness
- Emotion detection pipeline is complete and human-verified
- EmotionResult (with scores, dominant, intensity) is ready for Phase 3 particle system consumption
- Emotion weights may benefit from further tuning with more users in Phase 5

---
*Phase: 02-emotion-detection*
*Completed: 2026-02-06*
