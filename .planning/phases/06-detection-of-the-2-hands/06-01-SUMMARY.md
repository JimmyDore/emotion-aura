---
phase: 06-detection-of-the-2-hands
plan: 01
subsystem: ml, particles, ui
tags: [mediapipe, hand-detection, gesture, dual-hand, force-field, velocity-cap]

# Dependency graph
requires:
  - phase: 04-hand-gestures
    provides: "Single-hand gesture pipeline (HandDetector, GestureState, GestureClassifier, GestureOverlay, force fields)"
  - phase: 05-performance-polish
    provides: "Quality scaler, neon spark shader, branding, toggle buttons"
provides:
  - "Dual-hand detection with numHands: 2"
  - "Independent per-hand gesture recognition and force field application"
  - "Two-handed combined effects (push-push, push-attract, attract-attract)"
  - "Velocity magnitude cap preventing extreme dual-force velocities"
  - "Per-hand L/R gesture overlay labels"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Map<string, GestureState> keyed by MediaPipe handedness label for per-hand state"
    - "seenHands Set guard against same-handedness misclassification"
    - "Module-level MAX_SPEED constant for velocity magnitude capping"

key-files:
  created: []
  modified:
    - src/ml/HandDetector.ts
    - src/particles/ParticlePool.ts
    - src/ui/GestureOverlay.ts
    - src/main.ts

key-decisions:
  - "numHands: 2 on existing HandLandmarker (no new model or WASM changes needed)"
  - "gestureStates Map keyed by MediaPipe handedness label ('Left'/'Right') for independent per-hand state"
  - "seenHands Set guard skips duplicate handedness entries (~5% misclassification rate)"
  - "MAX_SPEED = 5.0 velocity cap prevents particles flying off-screen under overlapping dual forces"
  - "MediaPipe 'Left' = user's Right (mirrored camera) — swapped at UI layer only"

patterns-established:
  - "Per-hand iteration pattern: iterate handResult.landmarks with handedness routing"
  - "Dual aura Map pattern: handAuras Map<string, HTMLDivElement> for independent positioning"

# Metrics
duration: 6min
completed: 2026-02-07
---

# Phase 6 Plan 01: Dual-Hand Detection Summary

**Dual-hand gesture pipeline with independent per-hand recognition, dual force fields, velocity cap, and L/R overlay labels**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-07T10:11:44Z
- **Completed:** 2026-02-07T10:18:16Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Both hands detected simultaneously via MediaPipe numHands: 2
- Each hand independently recognizes push (open hand) and attract (fist) gestures
- Two-handed combined effects work naturally: push-push compound explosion, push-attract tug-of-war, attract-attract dual orbits
- Velocity magnitude cap (MAX_SPEED = 5.0) prevents particles from extreme speeds under overlapping dual forces
- Per-hand L/R gesture overlay with correct MediaPipe handedness mirroring
- Single-hand usage fully backwards compatible

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable dual-hand detection and add velocity cap** - `69c8c6d` (feat)
2. **Task 2: Dual-hand GestureOverlay and main.ts pipeline integration** - `77199e2` (feat)
3. **Task 3: Human verification** - approved (small delay switching gestures = expected 150ms stability timer)

## Files Created/Modified
- `src/ml/HandDetector.ts` - numHands: 1 → 2, JSDoc updated
- `src/particles/ParticlePool.ts` - Added MAX_SPEED constant and velocity magnitude cap after damping
- `src/ui/GestureOverlay.ts` - update() takes two GestureType params, displays L:/R: labels with handedness swap
- `src/main.ts` - gestureStates Map, handAuras Map, dual-hand iteration, seenHands guard, per-hand force fields, per-hand aura positioning, any-hand-active occlusion, HMR cleanup updated

## Decisions Made
- [06-01]: numHands: 2 on existing HandLandmarker — no new model/WASM needed
- [06-01]: gestureStates Map<string, GestureState> keyed by handedness for independent per-hand state
- [06-01]: seenHands Set guard prevents duplicate processing when MediaPipe misclassifies handedness
- [06-01]: MAX_SPEED = 5.0 velocity cap in ParticlePool.update() after damping step
- [06-01]: MediaPipe "Left" = user's Right hand (mirrored camera) — swapped at GestureOverlay UI layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 complete — dual-hand detection fully functional
- All 6 phases of the milestone are now complete
- Ready for milestone audit

---
*Phase: 06-detection-of-the-2-hands*
*Completed: 2026-02-07*
