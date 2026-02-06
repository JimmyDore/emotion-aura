# Emotion Aura

## What This Is

A web app that opens the user's webcam, detects their emotions in real-time using machine learning, and generates an organic particle system around them that visually responds to their emotional state. Users can also manipulate the particles with hand gestures. Built as a polished, portfolio-worthy demo of real-time computer vision.

## Core Value

The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Open webcam and display live feed in the browser
- [ ] Detect user emotions in real-time (happy, sad, angry, surprised, neutral)
- [ ] Generate organic/fluid particle system that reacts to detected emotion
- [ ] Happy = colorful, lively particles
- [ ] Sad = blue rain-like particles, slow movement
- [ ] Angry = red/orange flame-like particles, aggressive movement
- [ ] Surprised = burst/explosion effect
- [ ] Neutral = calm, subtle ambient particles
- [ ] Detect hand landmarks in real-time
- [ ] Open hand gesture pushes particles away
- [ ] Closed fist gesture attracts particles
- [ ] Pinch gesture concentrates particles into a point
- [ ] Smooth transitions between emotion states
- [ ] Polished UI with clean layout and smooth animations
- [ ] Works in modern browsers (Chrome, Firefox, Safari)

### Out of Scope

- Multiple face detection — single user experience only
- Audio/sound effects — visual only for v1
- Mobile support — desktop browsers only
- User accounts / persistence — ephemeral experience
- Recording/export video — live experience only
- Server-side processing — everything runs client-side

## Context

- Greenfield project, no existing code
- MediaPipe provides both face landmark detection (for emotions) and hand landmark detection in a single JavaScript library, well-suited for browser use
- WebGL (via Three.js or similar) is the standard approach for performant particle systems in the browser
- Emotion detection from facial landmarks is an established problem — can use MediaPipe Face Mesh landmarks + a classification layer, or a pre-trained model like face-api.js
- Real-time performance is critical — must maintain 30+ FPS with ML inference + particle rendering

## Constraints

- **Platform**: Web app (JavaScript/TypeScript) — chosen for easy sharing and portfolio showcasing
- **Runtime**: Fully client-side — no backend server, everything runs in the browser
- **Performance**: Must maintain 30+ FPS with webcam + ML inference + particle rendering simultaneously
- **Visual style**: Organic and fluid particles — soft edges, light trails, smooth movement, meditative vibe

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over Python desktop | Easy to share (just a URL), portfolio-friendly | — Pending |
| MediaPipe for ML | Runs natively in browser, handles both face and hand detection | — Pending |
| Organic/fluid visual style | Contrasts well with the technical ML layer, more visually impressive | — Pending |
| Gesture-based interaction (not zone-based) | Open hand = push, fist = attract, pinch = concentrate — intuitive and satisfying | — Pending |

---
*Last updated: 2026-02-06 after initialization*
