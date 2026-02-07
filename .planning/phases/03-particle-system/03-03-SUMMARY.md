---
phase: 03-particle-system
plan: 03
subsystem: integration
tags: [face-tracking, quality-scaling, particle-spawning, render-loop, emotion-reactive]

# Dependency graph
requires:
  - phase: 03-particle-system plan 01
    provides: ParticleSystem, ParticlePool, GLSL shaders
  - phase: 03-particle-system plan 02
    provides: EmotionProfile configs, blendProfiles(), particle constants
  - phase: 02-emotion-detection
    provides: FaceDetector, EmotionClassifier, EmotionState pipeline
provides:
  - Face-anchored particle spawning from ear landmarks
  - Emotion-driven particle profile blending in render loop
  - Adaptive FPS-based quality scaling with UI indicator
  - Dimmed webcam aesthetic for particle visibility
affects: [04-hand-gestures, 05-performance-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [ear-landmark-spawning, outward-flow-direction, fractional-spawn-accumulator, ema-landmark-smoothing]

key-files:
  created:
    - src/particles/FaceLandmarkTracker.ts
    - src/particles/QualityScaler.ts
  modified:
    - src/main.ts
    - src/style.css
    - src/particles/ParticlePool.ts
    - src/particles/ParticleSystem.ts
    - src/particles/EmotionProfile.ts
    - src/core/constants.ts
    - src/particles/shaders/particle.vert.glsl

key-decisions:
  - "Spawn from ear landmarks (234, 454) instead of nose tip — keeps face visible, fun visual effect"
  - "Outward flow direction computed as vector from face center through ear spawn point"
  - "Ortho camera needs plain aSize * uPixelRatio for gl_PointSize — perspective 300/z formula produced 15,000px particles"
  - "Spawn at activeCount index (append) not ring buffer cursor — cursor was incompatible with swap-compact death scheme"
  - "Doubled particle pool to 3000, increased spawn rate to 80/sec, bigger particles (35px), faster speeds for screen coverage"

patterns-established:
  - "FaceLandmarkTracker returns multiple spawn points (ears + center), not single position"
  - "Spawn accumulator pattern for fractional particle spawning at variable frame rates"
  - "QualityScaler with hysteresis (threshold + 5 for recovery) prevents oscillation"

# Metrics
duration: 8min
completed: 2026-02-07
---

# Phase 3 Plan 3: Face-Anchored Spawning & Integration Summary

**Full particle pipeline wired: ear-anchored spawning, emotion-driven profiles, adaptive quality scaling, dimmed webcam aesthetic**

## Performance

- **Duration:** ~8 min (including 2 bug fix rounds during human verification)
- **Started:** 2026-02-07T07:02:00Z
- **Completed:** 2026-02-07T07:20:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- FaceLandmarkTracker: converts MediaPipe ear landmarks (234, 454) and nose tip to scene coordinates with EMA smoothing
- QualityScaler: rolling FPS average, adaptive particle count reduction with hysteresis, DOM quality indicator
- Full render loop integration: face landmark tracking, emotion profile blending, fractional particle spawning from both ears, quality scaling
- Webcam dimmed to brightness(0.3) for dark aesthetic behind bright particles
- Particles flow outward from ears toward screen edges, face stays visible

## Task Commits

Each task was committed atomically:

1. **Task 1: FaceLandmarkTracker and QualityScaler** - `632634b` (feat)
2. **Task 2: Wire particle system into main.ts render loop and style webcam dimming** - `e0d7089` (feat)
3. **Bugfix: Particle pool spawn index and ortho point size** - `e562948` (fix)
4. **Bugfix: Spawn from ears, increase count and speed** - `b2b8914` (fix)

## Files Created/Modified
- `src/particles/FaceLandmarkTracker.ts` - MediaPipe ear landmarks to scene coordinates with EMA smoothing
- `src/particles/QualityScaler.ts` - FPS monitoring, adaptive particle scaling, DOM indicator
- `src/main.ts` - Full particle pipeline: ear spawning, emotion blending, quality scaling
- `src/style.css` - Webcam dimming (brightness 0.3), quality indicator styles
- `src/particles/ParticlePool.ts` - Fixed spawn index (activeCount instead of cursor)
- `src/particles/ParticleSystem.ts` - Default pool size from MAX_PARTICLES constant
- `src/particles/shaders/particle.vert.glsl` - Fixed ortho point size formula
- `src/particles/EmotionProfile.ts` - Increased speeds for screen-edge coverage
- `src/core/constants.ts` - Doubled pool/spawn/size/lifetime values

## Decisions Made
- Spawn from ear landmarks instead of nose tip: keeps face visible, particles flow outward naturally
- Fixed ortho point size: removed perspective-based 300/z scaling that produced 15,000px particles
- Fixed spawn index: ring buffer cursor was incompatible with swap-compact death; append at activeCount instead
- Doubled particle counts and speeds after user feedback — more dramatic visual effect
- Outward direction: computed as vector from face center through ear, blended with emotion direction bias

## Deviations from Plan

### Bug Fixes During Verification

**1. [Critical] Ortho point size formula**
- gl_PointSize used perspective formula (300/z) producing ~15,000px particles with ortho camera at z=1
- Fixed to plain `aSize * uPixelRatio`

**2. [Critical] Particle pool spawn index**
- Ring buffer cursor advanced independently from swap-compact death scheme
- New particles spawned outside [0, activeCount) draw range — invisible after first batch died
- Fixed: spawn at activeCount index (append to end of active region)

**3. [Enhancement] Spawn location and particle tuning**
- Changed from nose-tip spawning to ear landmarks per user feedback
- Doubled particle counts, sizes, speeds for better visual coverage

**Total deviations:** 3 (2 critical bugs, 1 enhancement from user feedback)

## Human Verification

**Status:** Approved
**Feedback:** Particles spawning from ears, good spread across screen, face visible. User noted visual polish items deferred to Phase 5:
- Particles could be larger/more ethereal (soft glow vs dot-like)
- Some particles still cross over face area
- Color blending could be more emotion-dominant (less neutral mixing)

## Issues Encountered
Two critical bugs discovered during human verification (both fixed). See Deviations above.

## User Setup Required
None.

## Next Phase Readiness
- Particle system complete and verified by user
- QualityScaler ready for Phase 5 performance tuning
- Visual polish items noted for Phase 5 (particle size, face exclusion zone, color dominance)
- ParticleSystem.getPool() exposed for gesture force fields in Phase 4

---
*Phase: 03-particle-system*
*Completed: 2026-02-07*
