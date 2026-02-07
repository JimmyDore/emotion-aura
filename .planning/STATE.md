# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.
**Current focus:** Phase 3 in progress -- emotion profiles and constants done, renderer integration next

## Current Position

Phase: 3 of 5 (Particle System)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-07 -- Completed 03-02-PLAN.md (Emotion Profiles)

Progress: [##########....] ~50%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~4.5 minutes
- Total execution time: ~33 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Camera & Foundation | 3/3 | ~19 min | ~6 min |
| 2. Emotion Detection | 2/2 | ~10 min | ~5 min |
| 3. Particle System | 2/3 | ~4 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 02-01 (~2 min), 02-02 (~8 min), 03-01 (~2 min), 03-02 (~2 min)
- Trend: Phase 3 data/config plans executing very fast

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 5 phases derived from requirement categories (CAM, EMO, PRT, GES, PRF)
- [Research]: Rule-based emotion classifier from face landmarks (no extra ML model needed)
- [Research]: Staggered ML inference (face on even frames, hand on odd) required for 30fps
- [01-01]: Dynamic import for stats.js to avoid verbatimModuleSyntax conflict with export= pattern
- [01-01]: No COOP/COEP headers yet (test without first, add if MediaPipe needs SharedArrayBuffer)
- [01-01]: WASM CDN pinned to @0.10.32 to match installed npm package version
- [01-02]: Sequential model downloads (face then hand) -- face needed first in Phase 2
- [01-02]: Estimated sizes fallback when Content-Length missing from CDN response
- [01-02]: Try Again button only for recoverable errors (in-use, unknown)
- [01-03]: Remove animate-fade-in class before opacity transition (fill-mode forwards blocks inline opacity)
- [01-03]: Parallel camera + model loading via Promise.all for faster startup
- [02-01]: All emotion weights/thresholds in constants.ts (single source of truth for tuning)
- [02-01]: EmotionClassifier is stateless -- smoothing deferred to EmotionState in Plan 02
- [02-02]: Stale frames (null from FaceDetector) must be skipped, not treated as face-lost
- [02-02]: NEUTRAL_SUPPRESSION_FACTOR tuned from 1.5 to 2.5 after live testing
- [02-02]: Angry/sad disambiguation uses chin crumple (mouthShrugLower) threshold, not noseSneer
- [02-02]: browDown shared between angry and sad weights; secondary signals differentiate
- [03-01]: Ashima/stegu MIT simplex noise (standard GLSL, not hand-rolled)
- [03-01]: Ring buffer swap-to-last-active for dead particles (O(1), contiguous active region)
- [03-01]: DynamicDrawUsage on all buffer attributes for optimal GPU streaming
- [03-01]: gl_PointSize base scale 300.0 for ortho camera at z=1
- [03-02]: Removed unused constants import -- profiles store multipliers, renderers import base constants directly
- [03-02]: Direction [0,0] means radial outward; renderer interprets zero-length as radial spread
- [03-02]: blendProfiles normalizes direction after weighted sum to prevent magnitude drift

### Pending Todos

None.

### Blockers/Concerns

- Exact package versions verified: three@0.182.0, @mediapipe/tasks-vision@0.10.32, vite@7.3.1, typescript@5.9.3, vite-plugin-glsl@1.5.1
- Safari-specific WebGL/MediaPipe behavior may need investigation in Phase 5
- COOP/COEP headers may be needed if MediaPipe requires SharedArrayBuffer (not needed so far -- models loaded without issue)
- Emotion weights may benefit from further tuning with more users in Phase 5

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 03-02-PLAN.md, ready for 03-03 (Particle Renderer integration)
Resume file: None
