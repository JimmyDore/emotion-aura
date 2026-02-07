---
phase: 04-hand-gestures
plan: 03
subsystem: particles, integration
tags: [force-fields, gesture-pipeline, hand-aura, spring-orbit]

# Dependency graph
requires:
  - phase: 04-hand-gestures
    plan: 01
    provides: HandDetector with staggered inference
  - phase: 04-hand-gestures
    plan: 02
    provides: GestureClassifier, GestureState, GestureOverlay
provides:
  - applyForceField() in ParticlePool (push + attract)
  - Full gesture pipeline wired in main.ts
  - Hand aura visualization
  - Occlusion handling (hand covers face = freeze emotion)
affects: [05-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spring-orbit attract: equilibrium distance + tangential force + velocity damping"
    - "Hand-frame dt tracking for correct stability timer accumulation"

key-files:
  modified:
    - src/particles/ParticlePool.ts
    - src/main.ts
    - src/core/constants.ts
    - src/core/types.ts
    - src/ml/GestureClassifier.ts
    - src/ui/GestureOverlay.ts

key-decisions:
  - "Removed pinch/concentrate gesture — simplified to push (open hand) + attract (fist) only"
  - "Attract uses spring-orbit: equilibrium at 20% radius, tangential orbit force, velocity damping"
  - "Influence radius 300px, push strength 50, attract strength 30"
  - "Hand-frame dt tracked separately from render-frame dt for correct stability timer"
  - "Gesture forces override emotion velocity (speedScale 0.2) but not colors or spawn position"

patterns-established:
  - "Spring-orbit force field: pull when far, push when close, tangent for orbit, damp to settle"
  - "Separate dt tracking for staggered inference subsystems"

# Metrics
duration: 15min
completed: 2026-02-07
---

# Phase 4 Plan 3: Force Fields & Full Integration Summary

**Gesture-to-particle force fields with spring-orbit attract, push explosion, hand aura, and full pipeline integration**

## Performance

- **Duration:** 15 min (including human verification and 3 rounds of tuning)
- **Started:** 2026-02-07T09:30:00Z
- **Completed:** 2026-02-07T09:47:50Z
- **Tasks:** 3 (2 auto + 1 human verify)
- **Files modified:** 6

## Accomplishments
- applyForceField() in ParticlePool with push (radial explosion) and attract (spring orbit)
- Full gesture pipeline wired: HandDetector → GestureClassifier → GestureState → force field → GestureOverlay + hand aura
- Occlusion handling: hand covering face freezes emotion state
- Gesture override: particle spawn velocity reduced to 20% when gesture active so force fields dominate

## Task Commits

1. **Task 1: Add applyForceField() to ParticlePool** - `091b249` (feat)
2. **Task 2: Wire complete gesture pipeline in main.ts** - `849edbf` (feat)
3. **Task 3: Human verification** - approved after tuning
4. **Post-verification fix** - `d5eff6f` (fix) — removed pinch, fixed orbit radius, fixed dt bug

## Files Created/Modified
- `src/particles/ParticlePool.ts` - applyForceField() method with push/attract force behaviors, spring-orbit physics
- `src/main.ts` - Full gesture pipeline integration, occlusion handling, hand aura positioning, gesture override
- `src/core/constants.ts` - Removed pinch constants, adjusted influence radius and force strengths
- `src/core/types.ts` - Removed 'pinch' from GestureType union
- `src/ml/GestureClassifier.ts` - Removed pinch detection logic
- `src/ui/GestureOverlay.ts` - Removed 'concentrate' label

## Decisions Made
- Removed pinch/concentrate gesture entirely — user preferred just push + attract for simpler, more intuitive interaction
- Attract rewritten as spring-orbit: particles float and orbit around hand instead of spiraling through center
  - Equilibrium distance at 20% of influence radius (0.2 * radius)
  - Radial force: push when closer than equilibrium, pull when farther
  - Tangential force for orbital motion
  - Velocity damping to settle particles into stable orbit
- Influence radius tuned from 100px → 600px → 300px through iteration
- Force strengths tuned: push 50, attract 30
- Fixed stability timer dt: was receiving render-frame dt (~8ms at 119fps), now receives hand-frame dt (~66ms at 15fps)
- Hand-frame dt tracked separately from render-frame dt for correct gesture stability timing

## Deviations from Plan
- **Pinch gesture removed** (user decision during verification) — plan originally specified three gestures (push/attract/pinch), final implementation has two (push/attract)
- **Attract physics completely rewritten** from simple spiral to spring-orbit — plan specified "spiral inward (tangential + radial)", implementation uses equilibrium-based spring-orbit for smoother, more controllable motion
- **Influence radius and force strengths significantly tuned** from original values — plan didn't specify exact values, iterative tuning during verification found optimal settings
- **Hand-frame dt tracking added** (bug discovered during verification) — plan didn't account for dt mismatch between staggered inference frames and render frames

## Issues Encountered
- **Initial force field had zero effect:** Influence radius (100px = 0.185 scene units) was far too small for particles 0.5-1.5 scene units away from hand. Increased to 600px, then tuned down to 300px for optimal feel.
- **Attract spiral pulled particles through the center:** Simple radial+tangential force caused particles to spiral inward through the hand position instead of orbiting around it. Rewrote as spring-orbit with equilibrium distance, now particles settle into stable orbit.
- **~1sec gesture recognition delay:** Stability timer was accumulating render-frame dt (~8ms) instead of hand-frame dt (~66ms), causing 150ms stability threshold to require ~20 frames instead of ~3 hand frames. Fixed by tracking hand-frame dt separately.
- All resolved through iterative tuning during human verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 complete — hand gesture particle manipulation working with push and attract gestures
- Gesture pipeline verified: hand detection, classification, stability, force fields, UI overlay, hand aura all integrated
- Ready for Phase 5: Performance & Polish
- Potential polish items for Phase 5:
  - Particle visual polish: larger glow radius for more ethereal look
  - Face exclusion zone: particles fade/avoid face area
  - Color dominance: reduce neutral blending when strong emotion detected
  - Fix dark webcam feed: screen is way too dim, investigate compositing/overlay opacity

---
*Phase: 04-hand-gestures*
*Completed: 2026-02-07*
