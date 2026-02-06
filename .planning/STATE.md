# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.
**Current focus:** Phase 2 complete — ready for Phase 3

## Current Position

Phase: 2 of 5 (Emotion Detection) — COMPLETE
Plan: 2 of 2 in current phase
Status: Complete — verified ✓
Last activity: 2026-02-06 -- Phase 2 verified (10/10 must-haves passed)

Progress: [########......] 43%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~6 minutes
- Total execution time: ~29 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Camera & Foundation | 3/3 | ~19 min | ~6 min |
| 2. Emotion Detection | 2/2 | ~10 min | ~5 min |

**Recent Trend:**
- Last 5 plans: 01-02 (~2 min), 01-03 (~12 min), 02-01 (~2 min), 02-02 (~8 min)
- Trend: Phase 2 averaged 5 min/plan including human verification checkpoint

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

### Pending Todos

None.

### Blockers/Concerns

- Exact package versions verified: three@0.182.0, @mediapipe/tasks-vision@0.10.32, vite@7.3.1, typescript@5.9.3
- Safari-specific WebGL/MediaPipe behavior may need investigation in Phase 5
- GLSL techniques for organic/fluid particle aesthetic may need research during Phase 3
- COOP/COEP headers may be needed if MediaPipe requires SharedArrayBuffer (not needed so far -- models loaded without issue)
- Emotion weights may benefit from further tuning with more users in Phase 5

## Session Continuity

Last session: 2026-02-06
Stopped at: Phase 2 complete, ready for Phase 3 planning
Resume file: None
