---
phase: 03-particle-system
plan: 02
subsystem: particles
tags: [emotion-profiles, lerp, blend, particle-config, data-driven]

# Dependency graph
requires:
  - phase: 02-emotion-detection
    provides: EmotionType and EmotionScores types for profile keying
  - phase: 03-particle-system plan 01
    provides: GLSL shaders that will consume these profiles
provides:
  - EmotionProfileConfig type definition
  - EMOTION_PROFILES map (5 distinct visual configs)
  - lerpProfile() for morph-in-place transitions
  - blendProfiles() for multi-emotion weighted blending
  - Particle system constants (MAX_PARTICLES, SPAWN_RATE_BASE, etc.)
affects: [03-particle-system plan 03, 04-hand-gestures, 05-performance-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [data-driven-config, lerp-interpolation, weighted-blend]

key-files:
  created: [src/particles/EmotionProfile.ts]
  modified: [src/core/constants.ts]

key-decisions:
  - "Removed unused constants import from EmotionProfile.ts -- renderers import constants directly when computing actual values from multipliers"
  - "Direction [0,0] means radial outward (angry/surprised); renderer interprets zero-length direction as radial spread"
  - "blendProfiles normalizes direction after weighted sum to prevent magnitude drift"
  - "Color arrays padded with last color when lengths differ during lerp"

patterns-established:
  - "Data-driven emotion config: add visual parameters to EmotionProfileConfig, not rendering code"
  - "Multiplier-based scaling: profiles store multipliers, renderers multiply by base constants at runtime"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 2: Emotion Profiles Summary

**Data-driven visual profiles for 5 emotions with lerp/blend functions for morph-in-place particle transitions**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-07T06:56:59Z
- **Completed:** 2026-02-07T06:58:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Centralized 8 particle system constants in constants.ts (MAX_PARTICLES, spawn rates, quality thresholds)
- Defined 5 visually distinct emotion profiles as pure data configs (colors, speed, direction, spread, multipliers)
- Implemented lerpProfile() for smooth morph-in-place transitions between any two emotion states
- Implemented blendProfiles() for multi-emotion weighted blending from EmotionScores

## Task Commits

Each task was committed atomically:

1. **Task 1: Particle constants in constants.ts** - `b8cc1f7` (feat)
2. **Task 2: EmotionProfile configs and lerp function** - `05ff3ca` (feat)

## Files Created/Modified
- `src/core/constants.ts` - Added 8 particle system constants (MAX_PARTICLES, SPAWN_RATE_BASE/MAX, PARTICLE_LIFETIME_BASE, PARTICLE_SIZE_BASE, QUALITY_FPS_THRESHOLD, QUALITY_SCALE_DELAY, QUALITY_MIN_PARTICLES)
- `src/particles/EmotionProfile.ts` - EmotionProfileConfig interface, EMOTION_PROFILES map (5 emotions), lerpProfile(), blendProfiles()

## Decisions Made
- Removed unused constants import from EmotionProfile.ts: profiles store multipliers, not computed values. The renderer will import base constants directly when calculating actual particle sizes/lifetimes/spawn rates.
- Direction [0, 0] convention for angry/surprised means "radial outward from center" -- the renderer interprets zero-length direction vectors as radial spread.
- blendProfiles() normalizes the blended direction vector to prevent magnitude drift when summing weighted directions.
- Color lerp pads shorter arrays with their last color to handle profiles with different color count.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused constants import**
- **Found during:** Task 2 (EmotionProfile configs)
- **Issue:** Plan specified importing PARTICLE_LIFETIME_BASE, PARTICLE_SIZE_BASE, SPAWN_RATE_BASE from constants.ts, but these are not used directly in the file (profiles use multipliers, not computed values). TypeScript errored: TS6192 unused imports.
- **Fix:** Removed the unused import. Renderers will import constants directly when computing actual values.
- **Files modified:** src/particles/EmotionProfile.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 05ff3ca (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor import adjustment. No scope creep. Design intent preserved -- multiplier pattern works correctly.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Emotion profiles ready to be consumed by particle system renderer (Plan 03-03)
- lerpProfile() ready for morph-in-place transitions when emotion changes
- blendProfiles() ready for multi-emotion particle blending
- All particle constants available for pool sizing and quality scaling

---
*Phase: 03-particle-system*
*Completed: 2026-02-07*
