# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.
**Current focus:** All phases complete — milestone ready for audit

## Current Position

Phase: 5 of 5 (Performance & Polish)
Plan: 2 of 2 in current phase (all complete)
Status: Phase complete — human verified and approved
Last activity: 2026-02-07 -- Phase 5 execution finalized

Progress: [################] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: ~5 minutes
- Total execution time: ~68 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Camera & Foundation | 3/3 | ~19 min | ~6 min |
| 2. Emotion Detection | 2/2 | ~10 min | ~5 min |
| 3. Particle System | 3/3 | ~12 min | ~4 min |
| 4. Hand Gestures | 3/3 | ~19 min | ~6 min |
| 5. Performance & Polish | 2/2 | ~9 min | ~4.5 min |

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
- [05-01]: Three-term exponential glow (core 12x + halo 4x + outer 1.5x) with 1.4x color boost for neon sparks
- [05-01]: Face center from FACE_OVAL average (36 landmarks) not nose tip -- more stable for aura effect
- [05-01]: Webcam brightness(0.8) contrast(1.1) saturate(1.05) -- face visible, particles still pop
- [05-01]: NEUTRAL_SUPPRESSION_FACTOR increased from 2.5 to 3.5 for vivid emotion colors
- [05-02]: Quality scaler operates silently (no DOM indicator)
- [05-02]: WebGL context loss handled gracefully (preventDefault + pause render loop)
- [05-02]: gl_PointSize capped to ALIASED_POINT_SIZE_RANGE[1] / (pixelRatio * 1.5) for Safari safety
- [05-02]: Stats toggle at bottom-left, Overlays toggle at bottom-right
- [05-02]: "Emotion Aura" branding + jimmydore.fr at top-center
- [05-final]: Particle lifetime base 3.5→12s, pool 3000→5000, all emotion multipliers unified at 1.5x (18s) for visible accumulation

### Pending Todos

None — all phases complete.

### Blockers/Concerns

None remaining.

## Session Continuity

Last session: 2026-02-07
Stopped at: All phases complete. Milestone ready for audit.
Resume file: None
