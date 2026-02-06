---
phase: 02-emotion-detection
plan: 01
subsystem: ml
tags: [mediapipe, face-landmarker, blendshapes, emotion-classification, facs]

# Dependency graph
requires:
  - phase: 01-camera-foundation
    provides: "ModelLoader with pre-downloaded face model buffer, WASM_CDN constant"
provides:
  - "FaceDetector: FaceLandmarker wrapper with init/detect/close lifecycle"
  - "EmotionClassifier: blendshape-to-emotion weighted sum classifier"
  - "EmotionType, EmotionScores, EmotionResult, BlendshapeWeight types"
  - "EMOTION_WEIGHTS, EMA_ALPHA, NEUTRAL_SUPPRESSION_FACTOR constants"
affects: [02-02-PLAN, 03-particle-system, 04-hand-gestures]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FaceLandmarker.createFromOptions with modelAssetBuffer for pre-downloaded model init"
    - "Blendshape lookup by categoryName (never array index) to avoid _neutral offset"
    - "Stale frame detection via lastVideoTime tracking"
    - "Stateless classifier + external smoothing separation"
    - "FACS-based weighted sum emotion classification with tunable constants"

key-files:
  created:
    - "src/ml/FaceDetector.ts"
    - "src/ml/EmotionClassifier.ts"
  modified:
    - "src/core/types.ts"
    - "src/core/constants.ts"

key-decisions:
  - "All emotion weights and thresholds in constants.ts (single source of truth for tuning)"
  - "EmotionClassifier is stateless -- smoothing deferred to EmotionState in Plan 02"

patterns-established:
  - "ML wrapper pattern: init(buffer, wasmPath) / detect(video) / close() lifecycle"
  - "Weighted sum classification from FACS blendshape mappings in constants.ts"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 2 Plan 1: ML Pipeline Core Summary

**FaceLandmarker wrapper with GPU-accelerated blendshape extraction and FACS-based weighted-sum emotion classifier for 5 emotions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T20:42:07Z
- **Completed:** 2026-02-06T20:44:23Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- FaceDetector wraps MediaPipe FaceLandmarker with GPU delegate, VIDEO mode, blendshape output enabled, and stale frame detection
- EmotionClassifier converts 52 blendshape scores into 5 emotion categories (happy, sad, angry, surprised, neutral) via weighted sums
- All emotion weights and smoothing parameters centralized in constants.ts for easy tuning
- Type system extended with EmotionType, EmotionScores, EmotionResult, and BlendshapeWeight

## Task Commits

Each task was committed atomically:

1. **Task 1: Emotion types and classifier constants** - `39cfea2` (feat)
2. **Task 2: FaceDetector -- MediaPipe FaceLandmarker wrapper** - `c49aa1e` (feat)
3. **Task 3: EmotionClassifier -- blendshape scores to emotion categories** - `6eeb49c` (feat)

## Files Created/Modified
- `src/core/types.ts` - Added EmotionType, EmotionScores, EmotionResult, BlendshapeWeight types
- `src/core/constants.ts` - Added EMOTION_WEIGHTS (FACS-based blendshape mappings), EMA_ALPHA, EMA_ALPHA_FACE_LOST, NEUTRAL_SUPPRESSION_FACTOR
- `src/ml/FaceDetector.ts` - FaceLandmarker wrapper with init/detect/close, stale frame skip, GPU delegate
- `src/ml/EmotionClassifier.ts` - Stateless classifier with weighted sum classify() and extractDominant() methods

## Decisions Made
- All emotion weights and thresholds live in constants.ts as a single source of truth, not hardcoded in classifier logic
- EmotionClassifier is intentionally stateless -- smoothing will be handled by EmotionState in Plan 02, keeping classification pure and testable
- FaceDetector accepts wasmCdnPath as parameter (not importing WASM_CDN directly) for testability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FaceDetector and EmotionClassifier are ready for Plan 02 integration
- Plan 02 will add EmotionState (EMA smoother), EmotionOverlay (UI), and main.ts pipeline wiring
- Emotion weights may need tuning after live testing with the webcam in Plan 02's human verification checkpoint

---
*Phase: 02-emotion-detection*
*Completed: 2026-02-06*
