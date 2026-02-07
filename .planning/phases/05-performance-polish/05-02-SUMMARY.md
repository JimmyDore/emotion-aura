---
phase: 05-performance-polish
plan: 02
subsystem: ui-polish
tags: [quality-scaler, webgl-context-loss, toggle-buttons, branding, pointsize-safety, cross-browser]
dependency-graph:
  requires: [phase-05-01]
  provides: [silent-quality-scaler, context-loss-handling, toggle-ui, branding, pointsize-safety]
  affects: []
tech-stack:
  added: []
  patterns: [silent-quality-degradation, webgl-context-loss-recovery, dom-toggle-buttons]
key-files:
  created: []
  modified:
    - src/particles/QualityScaler.ts
    - src/scene/SceneManager.ts
    - src/main.ts
    - src/style.css
    - src/ui/EmotionOverlay.ts
    - src/ui/GestureOverlay.ts
decisions:
  - id: 05-02-01
    description: "Quality indicator removed entirely -- scaling operates silently with no user-visible feedback"
  - id: 05-02-02
    description: "WebGL context loss handled with event.preventDefault() for restoration attempt + early return in animate()"
  - id: 05-02-03
    description: "effectiveParticleSize capped to ALIASED_POINT_SIZE_RANGE / (pixelRatio * 1.5) for Safari safety"
  - id: 05-02-04
    description: "Stats toggle bottom-left, Overlays toggle bottom-right -- minimal glassmorphic buttons"
  - id: 05-02-05
    description: "Branding at top-center: 'Emotion Aura' title + jimmydore.fr link with pointer-events on link only"
metrics:
  duration: ~7 min
  completed: 2026-02-07
---

# Phase 5 Plan 2: Silent Quality Scaler, Toggle UI, Branding, Cross-Browser Safety Summary

**Silent quality scaling, WebGL context loss handling, Stats/Overlays toggle buttons, "Emotion Aura" branding, and gl_PointSize safety cap for portfolio-ready finish.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-07
- **Completed:** 2026-02-07
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- QualityScaler operates silently with no visible DOM indicator
- SceneManager handles WebGL context loss/restoration gracefully
- gl_PointSize capped to hardware ALIASED_POINT_SIZE_RANGE for cross-browser safety
- Stats toggle button (bottom-left) shows/hides FPS counter
- Overlays toggle button (bottom-right) shows/hides emotion/gesture overlays and hand aura
- "Emotion Aura" title with jimmydore.fr link at top-center
- Context loss early return in animate() prevents rendering on lost context
- Human verification passed -- all visual and functional checks approved

## Task Commits

Each task was committed atomically:

1. **Task 1: Silent quality scaler, context loss handling, pointSize safety** - `e6dbc56` (feat)
2. **Task 2: Fullscreen UI -- toggle buttons, branding, stats wrapper** - `d4dde47` (feat)
3. **Task 3: Full visual and functional verification** - Human checkpoint: approved

**Plan metadata:** (included in phase completion commit)

## Files Created/Modified
- `src/particles/QualityScaler.ts` - Removed DOM indicator, dispose() is no-op, all scaling logic preserved
- `src/scene/SceneManager.ts` - Added context loss handlers, getRenderer(), isContextLost()
- `src/main.ts` - Toggle buttons, branding, effectiveParticleSize cap, context loss early return, HMR cleanup
- `src/style.css` - Removed .quality-indicator, added .toggle-btn and .branding styles
- `src/ui/EmotionOverlay.ts` - Added getRoot() method for toggle control
- `src/ui/GestureOverlay.ts` - Added getRoot() method for toggle control

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-02-01 | Remove quality indicator entirely | User decision: quality degradation should be silent |
| 05-02-02 | Context loss with event.preventDefault() | Allows browser to attempt restoration; early return prevents render errors |
| 05-02-03 | effectiveParticleSize = min(base, maxHW / (pr * 1.5)) | Safari/some GPUs cap gl_PointSize at ~63px; prevents silent clamping |
| 05-02-04 | Stats bottom-left, Overlays bottom-right | Minimal glassmorphic buttons match fullscreen immersive aesthetic |
| 05-02-05 | Branding pointer-events: none on container, auto on link | Title doesn't interfere with particle canvas, link still clickable |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 5 complete. All performance and polish work finished:
- Neon spark shader with FACE_OVAL aura spawn
- Bright webcam feed with visible face
- Silent quality scaling
- Cross-browser safety (context loss, pointSize cap)
- Toggle buttons and branding
- Human-verified visual and functional correctness

---
*Phase: 05-performance-polish*
*Completed: 2026-02-07*
