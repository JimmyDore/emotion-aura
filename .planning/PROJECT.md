# Emotion Aura

## What This Is

A browser-based webcam app that detects emotions in real-time using MediaPipe ML and generates a GPU-accelerated particle system that visually responds to emotional state. Users manipulate particles with dual-hand gestures (push/attract). Built as a polished, portfolio-worthy demo of real-time computer vision running entirely client-side.

## Core Value

The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.

## Requirements

### Validated

- ✓ Open webcam and display mirrored live feed in the browser — v1.0
- ✓ Clear permission prompt before browser camera access — v1.0
- ✓ Helpful error messages for camera issues — v1.0
- ✓ Loading screen with progress for ML model download — v1.0
- ✓ Mobile gate ("best on desktop" message) — v1.0
- ✓ Detect user emotions in real-time (happy, sad, angry, surprised, neutral) — v1.0
- ✓ Smooth emotion transitions with EMA smoothing — v1.0
- ✓ Emotion intensity scales with expression strength — v1.0
- ✓ Graceful fallback to neutral when no face detected — v1.0
- ✓ Organic/fluid particle system with custom GLSL shaders — v1.0
- ✓ Happy = warm, lively particles (gold/pink tones) — v1.0
- ✓ Sad = cool rain-like particles (blue tones) — v1.0
- ✓ Angry = aggressive flame-like particles (red/orange tones) — v1.0
- ✓ Surprised = burst/explosion effect (cyan/yellow tones) — v1.0
- ✓ Neutral = calm, subtle ambient particles (grey/silver tones) — v1.0
- ✓ Face-anchored particle spawning from FACE_OVAL contour — v1.0
- ✓ Adaptive quality scaling when FPS drops below 30 — v1.0
- ✓ Dual-hand detection with independent gesture recognition — v1.0
- ✓ Open hand gesture pushes particles away — v1.0
- ✓ Closed fist gesture attracts particles — v1.0
- ✓ Gesture visual indicators (L/R labels) — v1.0
- ✓ 150ms gesture stability before activation — v1.0
- ✓ 30+ FPS with all systems active — v1.0
- ✓ Cross-browser support (Chrome, Firefox, Safari) — v1.0
- ✓ Portfolio-quality polish with branding and toggle UI — v1.0
- ✓ Correct spatial alignment across all coordinate systems — v1.0

### Active

(None — define with next milestone)

### Out of Scope

- Multiple face detection — single user experience only, doubles ML cost
- Audio/sound effects — visual only, autoplay is hostile UX
- Mobile support — mobile GPU can't handle ML + particles at 30fps
- User accounts / persistence — ephemeral experience, no backend needed
- Recording/export video — complex, CPU-intensive, browser-inconsistent
- Server-side processing — adds latency, privacy concerns
- Custom gesture training — massive complexity, push/attract is sufficient
- Emotion history/analytics — shifts from artistic to surveillance

## Context

Shipped v1.0 with 3,041 LOC TypeScript in 1 day.
Tech stack: Vite 7, TypeScript, Three.js, MediaPipe (FaceLandmarker + HandLandmarker).
14 plans executed across 6 phases in ~74 minutes total.
All 28 requirements satisfied (1 intentionally removed: pinch gesture).
Audit passed with 100% scores across requirements, integration, and E2E flows.

## Constraints

- **Platform**: Web app (TypeScript) — chosen for easy sharing and portfolio showcasing
- **Runtime**: Fully client-side — no backend server, everything runs in the browser
- **Performance**: Must maintain 30+ FPS with webcam + ML inference + particle rendering simultaneously
- **Visual style**: Organic and fluid particles — soft edges, neon glow, smooth movement

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over Python desktop | Easy to share (just a URL), portfolio-friendly | ✓ Good — works as intended |
| MediaPipe for ML | Runs natively in browser, handles both face and hand detection | ✓ Good — blendshapes enable reliable emotion classification |
| Organic/fluid visual style | Contrasts well with the technical ML layer, more visually impressive | ✓ Good — neon spark shader achieved distinctive look |
| Gesture-based interaction | Open hand = push, fist = attract — intuitive and satisfying | ✓ Good — pinch removed, push/attract sufficient |
| Staggered ML inference | Face on even frames, hands on odd frames | ✓ Good — maintained 30+ FPS |
| EMA smoothing for emotions | Prevents jarring snaps between emotion states | ✓ Good — smooth 1-2s transitions |
| FACE_OVAL contour spawning | Particles spawn from head outline, not random positions | ✓ Good — creates aura effect |
| Velocity cap for dual forces | MAX_SPEED = 5.0 prevents extreme particle speeds | ✓ Good — prevents visual artifacts |
| numHands: 2 reuse | Same HandLandmarker config, no new model needed | ✓ Good — zero additional download cost |

---
*Last updated: 2026-02-07 after v1.0 milestone*
