---
phase: 01-camera-foundation
plan: 02
subsystem: camera-ml-ui
tags: [camera, mediapipe, getUserMedia, fetch, readablestream, dom, ui-screens]
requires:
  - "01-01: Core types (CameraError, LoadProgress), constants (FACE_MODEL_URL, HAND_MODEL_URL, CAMERA_CONSTRAINTS), CSS classes"
provides:
  - "CameraManager: webcam access with typed error handling for all 6 failure modes"
  - "ModelLoader: Fetch + ReadableStream model downloads with byte-level progress"
  - "PermissionScreen: pre-prompt camera explanation with Start button"
  - "LoadingScreen: real-time progress bar for model downloads"
  - "ErrorScreen: error-specific messages with recovery hints and retry for recoverable errors"
affects:
  - "01-03: Orchestration wires CameraManager, ModelLoader, and all 3 screens into main.ts flow"
  - "02-01: ModelLoader buffers are passed to MediaPipe FaceLandmarker initialization"
  - "04-01: ModelLoader hand buffer used for HandLandmarker initialization"
tech-stack:
  added: []
  patterns:
    - "getUserMedia error mapping to typed CameraError objects via DOMException.name switch"
    - "Fetch ReadableStream chunked download with byte-level progress tracking"
    - "Weighted combined progress across sequential downloads (55/45 split)"
    - "DOM-based UI screens with show/hide lifecycle and programmatic element creation"
    - "Fade-out transition via transitionend event listener for smooth screen removal"
key-files:
  created:
    - "src/camera/CameraManager.ts"
    - "src/ml/ModelLoader.ts"
    - "src/ui/PermissionScreen.ts"
    - "src/ui/LoadingScreen.ts"
    - "src/ui/ErrorScreen.ts"
  modified:
    - "src/style.css"
key-decisions:
  - decision: "Sequential model downloads (face then hand) instead of parallel"
    rationale: "Face model is needed first in Phase 2. Sequential download also simplifies combined progress calculation."
  - decision: "Estimated sizes as fallback when Content-Length is missing"
    rationale: "CDN may omit Content-Length for compressed responses. Using ~5MB/~4MB estimates with 95% cap prevents progress bar jumping."
  - decision: "Try Again button only for recoverable errors (in-use, unknown)"
    rationale: "Denied/not-found/overconstrained/security errors require user action outside the app (browser settings, hardware). Showing retry for those would waste user time."
  - decision: "SVG icons via innerHTML (static content only, no user data)"
    rationale: "Lightweight inline SVGs for camera and warning icons. No XSS risk since content is hardcoded, not user-supplied."
duration: "~2 minutes"
completed: "2026-02-06"
---

# Phase 1 Plan 02: CameraManager, ModelLoader, and UI Screens Summary

CameraManager with 6 typed getUserMedia error mappings, ModelLoader with Fetch ReadableStream byte-level progress, and three DOM-based UI screens (Permission, Loading, Error) for the startup flow.

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 minutes |
| Started | 2026-02-06T19:47:50Z |
| Completed | 2026-02-06T19:49:45Z |
| Tasks | 2/2 |
| Files created | 5 |
| Files modified | 1 |

## Accomplishments

1. **CameraManager** -- Requests webcam via getUserMedia with CAMERA_CONSTRAINTS, maps all 6 DOMException error names to typed CameraError objects with user-facing messages and recovery hints. Supports stream lifecycle (requestAccess, attachToVideo with loadedmetadata promise, stop with track cleanup).
2. **ModelLoader** -- Downloads face and hand MediaPipe model files sequentially via Fetch API with ReadableStream chunked reading. Reports byte-level progress through callbacks with weighted combined progress (face 0-55%, hand 55-100%). Falls back to estimated sizes when Content-Length header is missing.
3. **PermissionScreen** -- Pre-prompt explanation with camera SVG icon, "Emotion Aura" heading, description of the experience, privacy assurance ("Your video never leaves your device"), and pulsing "Start Experience" button. Entrance animation via CSS animate-fade-in.
4. **LoadingScreen** -- Progress bar with smooth CSS width transitions, real-time percentage text, and dynamic status label. Fade-out transition on hide via transitionend event for smooth screen removal.
5. **ErrorScreen** -- Displays error-specific messages and recovery hints based on CameraError type. Shows "Try Again" button only for recoverable errors (in-use, unknown). Warning triangle SVG icon with error color glow.
6. **CSS additions** -- Added permission-icon (primary color with drop-shadow glow) and privacy-note (muted, reduced opacity) styles to style.css.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | CameraManager and ModelLoader modules | 0187538 |
| 2 | Permission, Loading, and Error UI screens | c2b5cf2 |

## Files Created

| File | Purpose |
|------|---------|
| src/camera/CameraManager.ts | Webcam access with getUserMedia, stream lifecycle, typed error handling |
| src/ml/ModelLoader.ts | Fetch MediaPipe model files with ReadableStream progress tracking |
| src/ui/PermissionScreen.ts | Pre-prompt explanation screen with Start Experience button |
| src/ui/LoadingScreen.ts | Model download progress bar with real-time updates |
| src/ui/ErrorScreen.ts | Camera error display with recovery guidance and retry |

## Files Modified

| File | Changes |
|------|---------|
| src/style.css | Added .permission-icon and .privacy-note CSS classes |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Sequential model downloads (face then hand) | Face model needed first in Phase 2. Simplifies combined progress calculation. |
| Estimated sizes fallback for missing Content-Length | CDN may omit header for compressed responses. ~5MB/~4MB estimates with 95% cap prevents progress jump. |
| Try Again only for recoverable errors | Denied/not-found/overconstrained/security require user action outside app. Retry would be misleading. |
| SVG icons via innerHTML (hardcoded only) | Lightweight inline SVGs, no XSS risk since no user data is interpolated. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added CSS classes for PermissionScreen elements**
- **Found during:** Task 2
- **Issue:** Plan specified PermissionScreen uses a camera icon and privacy note, but style.css from Plan 01-01 did not include .permission-icon or .privacy-note classes.
- **Fix:** Added .permission-icon (primary color with drop-shadow filter) and .privacy-note (smaller muted text with reduced opacity) to style.css.
- **Files modified:** src/style.css
- **Commit:** c2b5cf2

## Issues Encountered

None.

## Next Phase Readiness

**For Plan 01-03 (Mobile gate, orchestration, full flow):**
- CameraManager is importable from `src/camera/CameraManager.ts` with requestAccess/attachToVideo/stop methods
- ModelLoader is importable from `src/ml/ModelLoader.ts` with loadAll/getFaceModelBuffer/getHandModelBuffer
- PermissionScreen (show/hide/onStart), LoadingScreen (show/hide/updateProgress), ErrorScreen (show/hide/onRetry) are ready for orchestration
- All screens accept the div#app container from index.html
- All types flow correctly: CameraManager throws CameraError, ModelLoader reports LoadProgress, ErrorScreen.show accepts CameraError, LoadingScreen.updateProgress accepts LoadProgress

**Blockers:** None.
