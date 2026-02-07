# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.
**Current focus:** Phase 4 in progress — hand gesture detection

## Current Position

Phase: 4 of 5 (Hand Gestures)
Plan: 3 of 3 in current phase
Status: Complete (pending verification)
Last activity: 2026-02-07 -- Completed 04-03-PLAN.md

Progress: [##############] 79%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~5 minutes
- Total execution time: ~64 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Camera & Foundation | 3/3 | ~19 min | ~6 min |
| 2. Emotion Detection | 2/2 | ~10 min | ~5 min |
| 3. Particle System | 3/3 | ~12 min | ~4 min |
| 4. Hand Gestures | 3/3 | ~19 min | ~6 min |

**Recent Trend:**
- Last 5 plans: 03-03 (~8 min), 04-01 (~2 min), 04-02 (~2 min), 04-03 (~15 min)
- Trend: Integration/verification plans take ~8-15 min, module creation plans ~2 min

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
- [03-02]: Removed unused constants import -- profiles store multipliers, renderers import base constants directly
- [03-02]: Direction [0,0] means radial outward; renderer interprets zero-length as radial spread
- [03-02]: blendProfiles normalizes direction after weighted sum to prevent magnitude drift
- [03-03]: Spawn from ear landmarks (234, 454) not nose tip — keeps face visible, fun visual
- [03-03]: Ortho camera needs plain aSize * uPixelRatio for gl_PointSize (not perspective 300/z)
- [03-03]: Spawn at activeCount index, not ring buffer cursor (cursor incompatible with swap-compact)
- [03-03]: Doubled particle pool (3000), spawn rate (80/sec), size (35px), lifetime (3.5s) after user feedback
- [04-01]: Independent FilesetResolver per detector (browser cache deduplicates WASM, avoids coupling)
- [04-01]: Outer lastVideoTime in animate() controls stagger; each detector retains own internal stale-frame check
- [04-01]: numHands: 1 for single-hand detection (performance over multi-hand)
- [04-01]: Hand results captured with void suppression until Plan 04-03 wires gesture pipeline
- [04-02]: Finger curl: TIP.y > PIP.y in MediaPipe normalized coords (y-down)
- [04-02]: Ambiguous hand poses (partial curl) classify as 'none' to avoid false positives
- [04-02]: Gesture overlay at top-left mirrors emotion overlay at top-right
- [04-03]: Removed pinch gesture — simplified to push (open hand) + attract (fist) only
- [04-03]: Attract uses spring-orbit (equilibrium + tangential + damping) not simple spiral
- [04-03]: Influence radius 300px, push 50, attract 30 (tuned from initial values)
- [04-03]: Hand-frame dt tracked separately for correct gesture stability timing
- [04-03]: Gesture forces override emotion velocity (0.2x) but not colors or spawn position

### Pending Todos

- [Phase 5] Particle visual polish: larger glow radius for more ethereal look (less dot-like)
- [Phase 5] Face exclusion zone: particles fade/avoid face area for cleaner look
- [Phase 5] Color dominance: reduce neutral blending when strong emotion is detected
- [Phase 5] Fix dark webcam feed: screen is way too dim, investigate compositing/overlay opacity

### Blockers/Concerns

- Exact package versions verified: three@0.182.0, @mediapipe/tasks-vision@0.10.32, vite@7.3.1, typescript@5.9.3, vite-plugin-glsl@1.5.1
- Safari-specific WebGL/MediaPipe behavior may need investigation in Phase 5
- COOP/COEP headers may be needed if MediaPipe requires SharedArrayBuffer (not needed so far -- models loaded without issue)
- Emotion weights may benefit from further tuning with more users in Phase 5

## Session Continuity

Last session: 2026-02-07
Stopped at: Phase 4 complete, ready for Phase 5 planning and verification
Resume file: None
