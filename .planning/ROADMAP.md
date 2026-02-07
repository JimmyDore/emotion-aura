# Roadmap: Emotion Aura

## Overview

Deliver a browser-based webcam app that detects emotions and renders reactive particles in real-time. The project builds vertically from camera foundation through ML detection, particle visualization, gesture interaction, and finally performance polish -- each phase producing a visible, testable artifact that progressively completes the experience.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Camera & Foundation** - Webcam feed with project scaffold, permission handling, and loading UX
- [x] **Phase 2: Emotion Detection** - Real-time face detection and emotion classification from facial landmarks
- [x] **Phase 3: Particle System** - Organic GPU-driven particle system that reacts to detected emotions
- [x] **Phase 4: Hand Gestures** - Hand tracking with gesture-based particle manipulation
- [ ] **Phase 5: Performance & Polish** - Cross-browser compatibility, performance tuning, and portfolio-quality finish

## Phase Details

### Phase 1: Camera & Foundation
**Goal**: User can open the app, grant camera access with clear guidance, and see their mirrored webcam feed in a clean browser interface
**Depends on**: Nothing (first phase)
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04, CAM-05
**Success Criteria** (what must be TRUE):
  1. User sees a clear explanation of why camera access is needed before the browser permission prompt appears
  2. User sees their mirrored webcam feed displayed in the browser after granting permission
  3. User sees a helpful, specific error message when camera is denied, unavailable, or already in use by another app
  4. User sees a loading screen with visible progress indication while ML models download
  5. User on a mobile device sees a friendly "best on desktop" message instead of a broken experience
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffold, Vite + TypeScript + Three.js setup, core types, and scene rendering
- [x] 01-02-PLAN.md -- CameraManager, ModelLoader, and UI screens (Permission, Loading, Error)
- [x] 01-03-PLAN.md -- Mobile gate, main.ts orchestration, and full flow integration

### Phase 2: Emotion Detection
**Goal**: User's face is detected in real-time and their emotional state is visually classified, with smooth transitions and intensity scaling
**Depends on**: Phase 1
**Requirements**: EMO-01, EMO-02, EMO-03, EMO-04, EMO-05
**Success Criteria** (what must be TRUE):
  1. User's face is tracked in real-time with visible feedback that detection is active
  2. User sees their current emotion (happy, sad, angry, surprised, neutral) classified correctly when they make deliberate expressions
  3. Emotion changes morph smoothly over 1-2 seconds with no jarring snaps between states
  4. Expression intensity matters -- a wider smile produces a stronger "happy" signal than a slight smile
  5. When user moves out of frame, the system gracefully falls back to neutral rather than glitching
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Emotion types, FaceDetector (FaceLandmarker wrapper), and EmotionClassifier (blendshape-to-emotion rules)
- [x] 02-02-PLAN.md -- EmotionState EMA smoother, EmotionOverlay UI, main.ts pipeline integration, and human verification

### Phase 3: Particle System
**Goal**: An organic, fluid particle system renders around the user's face and visually transforms based on their detected emotion
**Depends on**: Phase 2
**Requirements**: PRT-01, PRT-02, PRT-03, PRT-04, PRT-05, PRT-06, PRT-07, PRT-08
**Success Criteria** (what must be TRUE):
  1. Particles render with organic, fluid visual quality (soft edges, light trails, additive blending) -- not basic dots
  2. Each of the 5 emotion states produces a visually distinct particle behavior: warm lively particles for happy, cool rain-like particles for sad, aggressive flame-like particles for angry, burst/explosion for surprised, calm ambient drift for neutral
  3. Particles spawn from around the user's face position (tracked via landmarks), not from random screen locations
  4. Particle system automatically reduces quality (count, effects) if frame rate drops below 30 FPS
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- GLSL shaders (soft glow, simplex noise), ParticlePool ring buffer, and ParticleSystem Three.js mesh
- [x] 03-02-PLAN.md -- Emotion profile configs (5 visual profiles with colors, forces, behaviors) and particle constants
- [x] 03-03-PLAN.md -- Face-anchored spawning, emotion-driven rendering, adaptive quality scaling, and human verification

### Phase 4: Hand Gestures
**Goal**: User can manipulate particles with intuitive hand gestures -- pushing, attracting, and concentrating particles
**Depends on**: Phase 3
**Requirements**: GES-01, GES-02, GES-03, GES-04, GES-05, GES-06
**Success Criteria** (what must be TRUE):
  1. User's hands are detected in real-time alongside face detection without noticeable performance degradation
  2. User can push particles away by opening their hand, attract particles by making a fist, and concentrate particles into a point by pinching
  3. A small visual indicator on screen shows the user which gesture is currently detected
  4. Gestures only activate after brief stability (~150ms), preventing false triggers when transitioning between gestures
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md -- HandDetector wrapper and staggered face/hand inference in main.ts render loop
- [x] 04-02-PLAN.md -- GestureClassifier (rule-based), GestureState (stability + decay), GestureOverlay UI
- [x] 04-03-PLAN.md -- Force fields in ParticlePool, hand aura, gesture override, full integration and human verification

### Phase 5: Performance & Polish
**Goal**: The complete experience runs at 30+ FPS across major browsers with portfolio-quality visual polish and correct spatial alignment
**Depends on**: Phase 4
**Requirements**: PRF-01, PRF-02, PRF-03, PRF-04, PRF-05
**Success Criteria** (what must be TRUE):
  1. Application maintains 30+ FPS with all systems active (face detection, emotion classification, hand detection, gesture recognition, and full particle rendering)
  2. Application works correctly in Chrome, Firefox, and Safari on desktop
  3. UI has a polished, portfolio-worthy finish with clean layout and smooth animations
  4. All coordinate systems are correctly aligned -- mirrored webcam feed, MediaPipe landmarks, and particle positions all correspond spatially
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md -- Neon spark shader, FACE_OVAL head-outline spawn, webcam brightness fix, and color tuning
- [ ] 05-02-PLAN.md -- Silent quality scaler, cross-browser safety, toggle buttons, branding, and final verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Camera & Foundation | 3/3 | Complete | 2026-02-06 |
| 2. Emotion Detection | 2/2 | Complete | 2026-02-06 |
| 3. Particle System | 3/3 | Complete | 2026-02-07 |
| 4. Hand Gestures | 3/3 | Complete | 2026-02-07 |
| 5. Performance & Polish | 0/2 | Not started | - |
