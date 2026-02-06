# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.
**Current focus:** Phase 2 - Emotion Detection

## Current Position

Phase: 2 of 5 (Emotion Detection)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-06 -- Completed 02-01-PLAN.md (ML pipeline core: FaceDetector + EmotionClassifier)

Progress: [####..........] 29%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~5 minutes
- Total execution time: ~21 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Camera & Foundation | 3/3 | ~19 min | ~6 min |
| 2. Emotion Detection | 1/2 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~5 min), 01-02 (~2 min), 01-03 (~12 min), 02-01 (~2 min)
- Trend: 02-01 fast -- no new packages, pure TypeScript additions

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

### Pending Todos

None.

### Blockers/Concerns

- Exact package versions verified: three@0.182.0, @mediapipe/tasks-vision@0.10.32, vite@7.3.1, typescript@5.9.3
- Safari-specific WebGL/MediaPipe behavior may need investigation in Phase 5
- GLSL techniques for organic/fluid particle aesthetic may need research during Phase 3
- COOP/COEP headers may be needed if MediaPipe requires SharedArrayBuffer (not needed so far -- models loaded without issue)
- Emotion weights may need tuning after live webcam testing in Plan 02 checkpoint

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 02-01-PLAN.md, ready for 02-02-PLAN.md
Resume file: None
