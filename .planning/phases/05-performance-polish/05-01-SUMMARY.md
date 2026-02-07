---
phase: 05-performance-polish
plan: 01
subsystem: particle-visuals
tags: [glsl, shader, face-oval, webcam, css-filter, spawn-migration]
dependency-graph:
  requires: [phase-03, phase-04]
  provides: [neon-spark-shader, face-oval-spawn, webcam-brightness-fix]
  affects: [05-02]
tech-stack:
  added: []
  patterns: [three-term-exponential-glow, face-oval-contour-spawn, css-gpu-filter]
key-files:
  created: []
  modified:
    - src/particles/shaders/particle.frag.glsl
    - src/particles/FaceLandmarkTracker.ts
    - src/main.ts
    - src/core/constants.ts
    - src/style.css
decisions:
  - id: 05-01-01
    description: "Three-term exponential glow (core 12x + halo 4x + outer 1.5x) with 1.4x color boost for neon spark aesthetic"
  - id: 05-01-02
    description: "Face center computed from average of all 36 FACE_OVAL landmarks (more stable than nose tip)"
  - id: 05-01-03
    description: "Webcam brightness(0.8) contrast(1.1) saturate(1.05) -- bright enough for face visibility, dim enough for particle contrast"
  - id: 05-01-04
    description: "NEUTRAL_SUPPRESSION_FACTOR increased from 2.5 to 3.5 for more vivid emotion colors"
metrics:
  duration: ~2 minutes
  completed: 2026-02-07
---

# Phase 5 Plan 1: Neon Spark Shader, FACE_OVAL Spawn, Webcam Brightness Summary

**One-liner:** Three-term neon spark shader with FACE_OVAL aura spawn and webcam brightness fix for portfolio-quality particle visuals.

## What Was Done

### Task 1: Neon spark shader and webcam brightness fix
**Commit:** `e73f556`

**Fragment shader overhaul:**
- Replaced two-term glow (`exp(-dist * 6.0) * 0.8 + exp(-dist * 2.0) * 0.2`) with three-term neon spark exponential:
  - `core = exp(-dist * 12.0)` -- tight bright center spark
  - `halo = exp(-dist * 4.0) * 0.5` -- medium energy halo
  - `outer = exp(-dist * 1.5) * 0.15` -- subtle atmospheric glow
- Boosted color output 1.4x for neon intensity (additive blending handles >1.0 gracefully)
- Snappier fade: `smoothstep(0.0, 0.08, vLife)` quick fade-in, `smoothstep(1.0, 0.75, vLife)` slower fade-out for spark trail feel

**Webcam brightness:**
- Changed CSS filter from `brightness(0.3)` to `brightness(0.8) contrast(1.1) saturate(1.05)`
- Face clearly visible while maintaining enough contrast for particles to pop with additive blending

**Neutral suppression:**
- Increased `NEUTRAL_SUPPRESSION_FACTOR` from 2.5 to 3.5
- At 3.5: an emotion score of ~0.22 starts beating neutral (was ~0.30 at 2.5)
- Dominant emotions now produce more vivid, distinct colors with less neutral gray muddying

### Task 2: Migrate spawn from ears to FACE_OVAL head outline
**Commit:** `f45e678`

**FaceLandmarkTracker complete overhaul:**
- Defined 36 FACE_OVAL_INDICES from MediaPipe's FACEMESH_FACE_OVAL contour
- Replaced `leftEar`/`rightEar` spawn with `getRandomSpawnPoint()` method
- Face center now computed from average of all 36 oval landmarks (more stable than nose tip)
- Each of 36 oval points individually EMA-smoothed to reduce jitter (uses existing smooth() method)
- `FaceSpawnPoints` interface: `center` + `getRandomSpawnPoint()`

**main.ts spawn loop rewired:**
- Replaced `spawnSources[Math.random() < 0.5 ? 0 : 1]` with `facePoints.getRandomSpawnPoint()`
- Direction computation unchanged: outward from center through spawn point
- All emotion profile logic (spread, speed, color) preserved exactly

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-01-01 | Three-term exponential (12x/4x/1.5x) with 1.4x color boost | Produces tight cores with visible halos; additive blending creates natural bloom from overlapping particles |
| 05-01-02 | Face center from FACE_OVAL average | More stable than single nose tip landmark; reduces center jitter for aura emanation |
| 05-01-03 | Webcam at brightness(0.8) | Research recommended 0.7-0.9 range; 0.8 balances face visibility with particle contrast |
| 05-01-04 | NEUTRAL_SUPPRESSION_FACTOR 3.5 | Per user decision that emotion intensity shouldn't heavily influence behavior, but dominant emotions should produce distinct colors |

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (zero errors) |
| `npx vite build` | PASS (35 modules, 577ms) |
| Shader: three-term exponential + 1.4x boost | PASS |
| FaceLandmarkTracker: 36 FACE_OVAL_INDICES | PASS |
| main.ts: getRandomSpawnPoint(), no leftEar/rightEar | PASS |
| style.css: brightness(0.8) contrast(1.1) saturate(1.05) | PASS |
| constants.ts: NEUTRAL_SUPPRESSION_FACTOR = 3.5 | PASS |

## Next Phase Readiness

Plan 05-02 can proceed immediately. The visual foundation is in place:
- Neon spark shader ready for cross-browser testing
- FACE_OVAL spawn provides natural head-outline aura
- Webcam brightness makes face clearly visible
- No blockers or concerns for remaining polish work
