# Requirements: Emotion Aura

**Defined:** 2026-02-06
**Core Value:** The webcam feed must detect emotions and render reactive particles in real-time with fluid, visually impressive results.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Camera & Setup

- [x] **CAM-01**: User can open webcam and see mirrored live feed in the browser
- [x] **CAM-02**: User sees clear permission prompt explaining why camera access is needed before browser asks
- [x] **CAM-03**: User sees helpful error messages when camera is denied, unavailable, or in use
- [x] **CAM-04**: User sees a loading screen with progress while ML models (~9MB) download
- [x] **CAM-05**: User on mobile device sees a "best experienced on desktop" message instead of a broken experience

### Emotion Detection

- [ ] **EMO-01**: User's face is detected in real-time via MediaPipe FaceLandmarker
- [ ] **EMO-02**: User's emotion is classified into one of 5 categories: happy, sad, angry, surprised, neutral
- [ ] **EMO-03**: Emotion transitions are smooth (particles morph between states over ~1-2 seconds, no jarring snaps)
- [ ] **EMO-04**: Emotion intensity scales with expression strength (wider smile = more intense happy particles)
- [ ] **EMO-05**: When no face is detected, particles default to calm neutral state

### Particle System

- [ ] **PRT-01**: Organic/fluid particle system renders with custom GLSL shaders (soft edges, light trails, additive blending)
- [ ] **PRT-02**: Happy emotion triggers warm, colorful, lively particles (gold/pink tones, upward movement)
- [ ] **PRT-03**: Sad emotion triggers cool, slow particles (blue tones, rain-like downward movement)
- [ ] **PRT-04**: Angry emotion triggers aggressive, fast particles (red/orange tones, flame-like movement)
- [ ] **PRT-05**: Surprised emotion triggers burst/explosion effect (cyan/yellow tones, outward radial burst)
- [ ] **PRT-06**: Neutral emotion triggers calm, subtle ambient particles (grey/silver tones, gentle drift)
- [ ] **PRT-07**: Particles spawn from around the user's face position, not from random screen positions
- [ ] **PRT-08**: Particle system auto-adjusts quality (count, effects) if FPS drops below 30

### Hand Gestures

- [ ] **GES-01**: User's hands are detected in real-time via MediaPipe HandLandmarker
- [ ] **GES-02**: Open hand gesture pushes particles away from hand position
- [ ] **GES-03**: Closed fist gesture attracts particles toward hand position
- [ ] **GES-04**: Pinch gesture concentrates particles into a tight point at hand position
- [ ] **GES-05**: Gesture is visually indicated on screen (small icon or label showing detected gesture)
- [ ] **GES-06**: Gestures require ~150ms stability before activating (no false triggers during transitions)

### Performance & Polish

- [ ] **PRF-01**: Application maintains 30+ FPS with face detection, emotion classification, and particle rendering active
- [ ] **PRF-02**: Application maintains 30+ FPS with hand detection added (via staggered ML inference)
- [ ] **PRF-03**: Application works in Chrome, Firefox, and Safari (desktop)
- [ ] **PRF-04**: UI is polished with clean layout, smooth animations, portfolio-worthy finish
- [ ] **PRF-05**: All coordinate mappings are correct (mirrored webcam + MediaPipe landmarks align with particle positions)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Visual Enhancements

- **VIS-01**: Multiple particle visual themes (nebula, fireflies, ink in water) with keyboard shortcut to cycle
- **VIS-02**: Post-processing bloom/glow effects via Three.js EffectComposer
- **VIS-03**: Particle trails (fading ribbons of light following particle movement)

### UX Enhancements

- **UX-01**: Debug overlay (FPS counter, emotion confidence, landmark visualization) behind a dev flag
- **UX-02**: Onboarding calibration phase that teaches user how to trigger emotions and use gestures
- **UX-03**: Screenshot/snapshot capture for sharing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple face detection | Doubles ML cost, complicates gesture attribution, single-user experience |
| Audio/sound effects | Scope creep, separate domain, autoplay is hostile UX |
| Video recording/export | Complex, CPU-intensive, browser-inconsistent |
| User accounts / persistence | No backend needed, ephemeral experience |
| Mobile support | Mobile GPU can't handle ML + particles at 30fps, touch conflicts with gesture detection |
| Server-side ML processing | Adds latency, privacy concerns, infrastructure cost |
| Custom gesture training | Massive complexity, 3 gestures are sufficient and intuitive |
| Complex UI controls/settings | Turns demo into science experiment, kills the "wow" moment |
| Emotion history/analytics | Shifts from artistic experience to surveillance tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAM-01 | Phase 1 | Complete |
| CAM-02 | Phase 1 | Complete |
| CAM-03 | Phase 1 | Complete |
| CAM-04 | Phase 1 | Complete |
| CAM-05 | Phase 1 | Complete |
| EMO-01 | Phase 2 | Pending |
| EMO-02 | Phase 2 | Pending |
| EMO-03 | Phase 2 | Pending |
| EMO-04 | Phase 2 | Pending |
| EMO-05 | Phase 2 | Pending |
| PRT-01 | Phase 3 | Pending |
| PRT-02 | Phase 3 | Pending |
| PRT-03 | Phase 3 | Pending |
| PRT-04 | Phase 3 | Pending |
| PRT-05 | Phase 3 | Pending |
| PRT-06 | Phase 3 | Pending |
| PRT-07 | Phase 3 | Pending |
| PRT-08 | Phase 3 | Pending |
| GES-01 | Phase 4 | Pending |
| GES-02 | Phase 4 | Pending |
| GES-03 | Phase 4 | Pending |
| GES-04 | Phase 4 | Pending |
| GES-05 | Phase 4 | Pending |
| GES-06 | Phase 4 | Pending |
| PRF-01 | Phase 5 | Pending |
| PRF-02 | Phase 5 | Pending |
| PRF-03 | Phase 5 | Pending |
| PRF-04 | Phase 5 | Pending |
| PRF-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
