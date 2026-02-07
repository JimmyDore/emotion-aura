---
phase: 04-hand-gestures
plan: 01
subsystem: ml
tags: [mediapipe, handlandmarker, staggered-inference, hand-detection]

# Dependency graph
requires:
  - phase: 01-camera-foundation
    provides: ModelLoader with hand model buffer, WASM CDN constant
  - phase: 02-emotion-detection
    provides: FaceDetector pattern, emotion pipeline in render loop
provides:
  - HandDetector class with init/detect/close lifecycle
  - Staggered face/hand inference in render loop (even/odd frame alternation)
affects: [04-02 gesture classification, 04-03 gesture pipeline wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [staggered-inference, frame-alternating-detection]

key-files:
  created: [src/ml/HandDetector.ts]
  modified: [src/main.ts]

key-decisions:
  - "Independent FilesetResolver call per detector (browser cache deduplicates WASM, avoids coupling)"
  - "Outer lastVideoTime variable controls stagger; each detector retains its own internal stale-frame check"
  - "numHands: 1 for single-hand detection (performance over multi-hand)"
  - "Hand results captured with void suppression until Plan 04-03 wires gesture pipeline"

patterns-established:
  - "Staggered inference: outer frame toggle determines which ML model runs per video frame"
  - "HandDetector mirrors FaceDetector lifecycle (init/detect/close) for consistency"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 4 Plan 1: Hand Detection Integration Summary

**HandLandmarker wrapper with staggered face/hand inference alternating on video frames for zero-overhead hand detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T08:07:26Z
- **Completed:** 2026-02-07T08:08:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- HandDetector class created, mirroring FaceDetector pattern exactly (init/detect/close lifecycle)
- Staggered inference wired into render loop: face on even video frames, hand on odd video frames
- Emotion pipeline continues working correctly at half-rate face detection cadence
- Hand detection results captured and ready for gesture classification in Plan 04-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HandDetector class** - `f6b25f4` (feat)
2. **Task 2: Wire staggered inference into main.ts render loop** - `0d27c80` (feat)

## Files Created/Modified
- `src/ml/HandDetector.ts` - HandLandmarker wrapper with VIDEO mode, single-hand detection, GPU delegate
- `src/main.ts` - Staggered face/hand inference, HandDetector init and HMR cleanup

## Decisions Made
- Independent FilesetResolver.forVisionTasks() call per detector -- browser HTTP cache serves WASM instantly on second load, avoids cross-detector coupling for zero benefit
- Outer `lastVideoTime` variable in animate() controls which detector runs on each new video frame; each detector retains its own internal stale-frame check independently
- `numHands: 1` -- single hand detection to minimize per-frame inference cost
- Hand results assigned to variable with `void` suppression until Plan 04-03 wires gesture classification pipeline

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HandDetector initialized and detecting on alternating frames
- Hand landmark results available for gesture classification (Plan 04-02 defines GestureClassifier)
- Plan 04-03 will wire hand results into gesture pipeline and visual feedback
- Face emotion pipeline verified working at half-rate cadence

---
*Phase: 04-hand-gestures*
*Completed: 2026-02-07*
