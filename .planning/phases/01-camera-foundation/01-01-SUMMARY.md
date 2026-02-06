---
phase: 01-camera-foundation
plan: 01
subsystem: scaffold
tags: [vite, typescript, threejs, webgl, scaffold]
requires: []
provides:
  - "Vite 7 + TypeScript project scaffold"
  - "Core type system (CameraError, LoadProgress, AppState)"
  - "Configuration constants (model URLs, camera constraints)"
  - "Three.js transparent WebGL scene with render loop"
  - "HMR cleanup preventing WebGL context leaks"
affects:
  - "01-02: CameraManager and UI screens import from core/types and core/constants"
  - "01-03: main.ts orchestration replaces current skeleton"
  - "03-01: Particle system adds geometry to SceneManager.scene"
tech-stack:
  added:
    - "vite@^7.2.4"
    - "typescript@~5.9.3"
    - "three@^0.182.0"
    - "@mediapipe/tasks-vision@^0.10.32"
    - "@types/three@^0.182.0"
    - "stats.js@^0.17.0"
  patterns:
    - "Transparent WebGL overlay (alpha: true, clearColor 0x000000/0)"
    - "Orthographic camera for 2D particle overlay"
    - "Single rAF render loop (established for all future phases)"
    - "HMR dispose pattern for Three.js resource cleanup"
    - "Dynamic import for CommonJS-style dev tools (stats.js)"
key-files:
  created:
    - "package.json"
    - "vite.config.ts"
    - "tsconfig.json"
    - "index.html"
    - "src/style.css"
    - "src/core/types.ts"
    - "src/core/constants.ts"
    - "src/scene/SceneManager.ts"
    - "src/main.ts"
  modified: []
key-decisions:
  - decision: "Dynamic import for stats.js"
    rationale: "stats.js uses export= (CJS-style) which conflicts with verbatimModuleSyntax. Dynamic import avoids the issue cleanly."
  - decision: "Minimal vite.config.ts without COOP/COEP headers"
    rationale: "Per research recommendation: start without, add only if MediaPipe throws SharedArrayBuffer errors. Avoids cross-origin complexity."
  - decision: "Pinned WASM CDN to @0.10.32"
    rationale: "Matches installed npm package version. Prevents JS/WASM version mismatch."
duration: "~5 minutes"
completed: "2026-02-06"
---

# Phase 1 Plan 01: Project Scaffold and Three.js Scene Summary

Vite 7 + TypeScript + Three.js project scaffold with transparent WebGL overlay, stats.js FPS monitor, core type system, and HMR cleanup preventing context leaks.

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~5 minutes |
| Started | 2026-02-06T19:39:43Z |
| Completed | 2026-02-06T19:44:20Z |
| Tasks | 2/2 |
| Files created | 9 |

## Accomplishments

1. **Vite 7 project scaffold** -- vanilla-ts template with Three.js, MediaPipe, and stats.js dependencies installed. Dev server starts in ~100ms.
2. **Core type system** -- CameraError (6 error types with recovery hints), LoadProgress (byte-level tracking), and AppState (5-state machine) interfaces ready for Plan 01-02.
3. **Configuration constants** -- Model URLs, WASM CDN (pinned version), camera constraints (640x480@30fps), and pixel ratio cap defined centrally.
4. **Dark aesthetic CSS** -- Full reset, CSS custom properties color palette, UI overlay screens, button styles, progress bar, error messages, and glow animations.
5. **Three.js transparent scene** -- WebGLRenderer with alpha:true, orthographic camera, resize handling, and scene/camera exposed for Phase 3 particle additions.
6. **Render loop and FPS overlay** -- Single rAF loop with stats.js begin/end wrapping. Pattern established for all future phases.
7. **HMR cleanup** -- Dispose handler cancels rAF, disposes renderer + all geometries/materials via scene traversal, removes stats DOM element. Prevents WebGL context leaks during development.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Scaffold Vite project with dependencies and core modules | b2924dd |
| 2 | Three.js scene setup with render loop and HMR cleanup | 5312eb6 |

## Files Created

| File | Purpose |
|------|---------|
| package.json | Project manifest with all Phase 1 dependencies |
| vite.config.ts | Minimal Vite config (no COOP/COEP yet) |
| tsconfig.json | TypeScript strict mode, bundler resolution, ES2022 target |
| index.html | App shell with video#webcam and canvas#scene elements |
| src/style.css | Dark aesthetic CSS with custom properties, UI components, animations |
| src/core/types.ts | CameraError, LoadProgress, AppState interfaces |
| src/core/constants.ts | Model URLs, WASM CDN, camera constraints, pixel ratio cap |
| src/scene/SceneManager.ts | Three.js scene, renderer, camera, resize, dispose |
| src/main.ts | Entry point with render loop, stats.js, HMR cleanup |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dynamic import for stats.js | stats.js uses `export=` (CJS pattern) incompatible with `verbatimModuleSyntax`. Dynamic import resolves cleanly. |
| No COOP/COEP headers in vite.config.ts | Research recommends testing without first. Adds cross-origin complexity that may not be needed. |
| WASM CDN pinned to @0.10.32 | Matches npm package version to prevent JS/WASM mismatch at runtime. |
| Removed Vite scaffold files (counter.ts, typescript.svg, vite.svg) | Not needed for this project. Clean slate. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] stats.js import incompatibility with verbatimModuleSyntax**
- **Found during:** Task 2
- **Issue:** stats.js type declarations use `export =` (CommonJS-style), which is incompatible with the tsconfig `verbatimModuleSyntax: true` setting when using static ESM imports.
- **Fix:** Used dynamic `import('stats.js')` instead of static import. This avoids the type-level conflict while still loading the module correctly at runtime.
- **Files modified:** src/main.ts
- **Commit:** 5312eb6

## Issues Encountered

None beyond the stats.js import deviation noted above.

## Next Phase Readiness

**For Plan 01-02 (CameraManager, ModelLoader, UI Screens):**
- Core types (CameraError, LoadProgress, AppState) are importable from `src/core/types.ts`
- Constants (FACE_MODEL_URL, HAND_MODEL_URL, WASM_CDN, CAMERA_CONSTRAINTS) are importable from `src/core/constants.ts`
- index.html has video#webcam element ready for CameraManager
- CSS has .screen, .btn-primary, .progress-bar, .error-message classes ready for UI screens
- SceneManager is ready to be integrated into the orchestration flow

**Blockers:** None.
