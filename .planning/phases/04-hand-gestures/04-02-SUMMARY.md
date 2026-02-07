---
phase: 04-hand-gestures
plan: 02
subsystem: ml, ui
tags: [mediapipe, hand-landmarks, gesture-classification, state-machine, overlay]

# Dependency graph
requires:
  - phase: 01-camera-foundation
    provides: MediaPipe WASM runtime and hand model loading
  - phase: 04-hand-gestures plan 01
    provides: HandDetector with staggered inference pipeline
provides:
  - GestureClassifier (rule-based open/fist/pinch from hand landmarks)
  - GestureState (150ms stability timer + 300ms decay state machine)
  - GestureOverlay (gesture indicator UI component)
  - GestureType and GestureResult types in core/types.ts
  - Gesture constants centralized in core/constants.ts
affects: [04-hand-gestures plan 03, 05-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Finger curl detection via TIP vs PIP y-position comparison"
    - "Stability timer pattern: pending gesture must persist N ms before activation"
    - "Linear decay on signal loss: strength = 1 - (elapsed / decay_ms)"
    - "Overlay pattern: glassmorphic HUD with DOM-write minimization"

key-files:
  created:
    - src/ml/GestureClassifier.ts
    - src/state/GestureState.ts
    - src/ui/GestureOverlay.ts
  modified:
    - src/core/types.ts
    - src/core/constants.ts
    - src/style.css

key-decisions:
  - "Pinch has highest classification priority (before fist/open checks)"
  - "Finger curl: TIP.y > PIP.y in MediaPipe normalized coords (y-down)"
  - "Ambiguous hand poses (partial curl) classify as 'none' to avoid false positives"
  - "Pinch displays as 'concentrate' in UI for user-friendly labeling"
  - "Gesture overlay at top-left mirrors emotion overlay at top-right"

patterns-established:
  - "GestureClassifier is stateless (like EmotionClassifier) -- state managed separately"
  - "GestureState.getCurrent() for frames without new hand data (staggered inference)"
  - "Hand aura CSS prepared but not positioned until Plan 04-03 integration"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 4 Plan 2: Gesture Pipeline Summary

**Rule-based gesture classifier (open/fist/pinch), 150ms stability state machine with 300ms decay, and glassmorphic gesture overlay UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T08:08:37Z
- **Completed:** 2026-02-07T08:10:36Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- GestureClassifier detects open hand (push), closed fist (attract), and thumb-index pinch from 21 hand landmarks using pure distance/position heuristics
- GestureState implements 150ms stability timer to prevent gesture flicker during hand transitions, plus 300ms linear decay when hand leaves frame
- GestureOverlay displays current gesture at top-left with glassmorphic styling matching the EmotionOverlay pattern
- All gesture types and constants centralized in core/ files for single-source-of-truth tuning

## Task Commits

Each task was committed atomically:

1. **Task 1: Add gesture types and constants** - `bdf7a84` (feat)
2. **Task 2: Create GestureClassifier and GestureState** - `a43962d` (feat)
3. **Task 3: Create GestureOverlay UI and CSS** - `436ce3c` (feat)

## Files Created/Modified
- `src/core/types.ts` - Added GestureType union and GestureResult interface
- `src/core/constants.ts` - Added gesture detection constants (stability, decay, force, pinch threshold)
- `src/ml/GestureClassifier.ts` - Rule-based classifier: pinch > fist > open > none, plus getPalmCenter utility
- `src/state/GestureState.ts` - Stability timer + decay state machine with getCurrent() for staggered frames
- `src/ui/GestureOverlay.ts` - Gesture label overlay with DOM-write minimization and active/inactive states
- `src/style.css` - Gesture overlay CSS (glassmorphic, top-left) and hand aura CSS (prepared for 04-03)

## Decisions Made
- Pinch has highest classification priority (checked before fist/open) since pinch can occur with some fingers extended
- Finger curl detection uses TIP.y > PIP.y comparison (MediaPipe y-down normalized coords)
- Ambiguous hand poses (partial finger curl) classify as 'none' to avoid false positive gesture activations
- Pinch gesture displays as "concentrate" in the UI for more intuitive user understanding
- Gesture overlay positioned at top-left, mirroring emotion overlay at top-right for symmetric HUD layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three gesture pipeline modules (classify, stabilize, display) are standalone and ready for integration
- Plan 04-03 will wire these into the render loop: HandDetector -> GestureClassifier -> GestureState -> force field + GestureOverlay
- Hand aura CSS is pre-positioned for force field visualization
- Constants are tunable in constants.ts without touching classifier or state machine logic

---
*Phase: 04-hand-gestures*
*Completed: 2026-02-07*
