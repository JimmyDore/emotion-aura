# Research Summary: Emotion Aura

**Domain:** Real-time browser-based computer vision with ML inference and WebGL rendering
**Researched:** 2026-02-06
**Overall confidence:** HIGH (limited to MEDIUM for specific version numbers due to unavailable web access)

## Executive Summary

Building a real-time webcam-based emotion detection and particle visualization app in the browser is a well-trodden path in 2025/2026. The ecosystem has consolidated around MediaPipe for browser-based computer vision (face and hand tracking), Three.js for WebGL rendering, and Vite + TypeScript for build tooling. There are no major unknowns or bleeding-edge technologies required.

The critical technical challenge is not "can it be done" (it absolutely can) but "can it maintain 30+ FPS while running two ML models and a particle system simultaneously." This is achievable but requires deliberate performance engineering from the start: staggered inference, GPU-side particle simulation, and resolution management. The performance budget is tight enough that architectural decisions made in Phase 1 directly determine whether the 30fps target is met.

Emotion classification from facial landmarks is simpler than it sounds for the 5 target emotions. A rule-based geometric classifier on MediaPipe's 478-point face mesh handles happy/sad/angry/surprised/neutral without any additional ML model. Similarly, the 3 hand gestures (open/fist/pinch) are trivially classifiable from hand landmark geometry. This means the project has exactly one ML dependency (MediaPipe tasks-vision) rather than a stack of models.

The particle system is the creative core of the project and should receive the most development attention. Three.js Points with custom GLSL shaders provides the right level of control for organic, fluid particles. The emotion-to-visual mapping (color palettes, force fields, particle behaviors) is where the portfolio impact comes from, and this is pure creative development rather than a technical risk.

## Key Findings

**Stack:** Vite + TypeScript + @mediapipe/tasks-vision + Three.js + custom GLSL shaders. No UI framework. Fully client-side.

**Architecture:** Single-page app with a requestAnimationFrame render loop orchestrating ML inference (staggered), classification (rule-based), and particle rendering (GPU-driven). Clean separation between ML pipeline, classification logic, and rendering.

**Critical pitfall:** Running face AND hand detection every frame will blow the frame budget. Must stagger inference (face on even frames, hand on odd frames) or the 30fps target fails on mid-range hardware.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Camera** - Get webcam feed running with Vite + TS + Three.js scaffold
   - Addresses: Core setup, camera access, basic Three.js scene
   - Avoids: Premature optimization by establishing the render loop early

2. **Face Detection & Emotion** - MediaPipe FaceLandmarker + rule-based emotion classifier
   - Addresses: Face landmarks, emotion classification, visual feedback
   - Avoids: Over-engineering emotion detection (start rules-based, not ML)

3. **Particle System Core** - Three.js Points + custom shaders, emotion-reactive behavior
   - Addresses: The visual centerpiece, color palettes, force fields
   - Avoids: Coupling particles to gestures before particles work standalone

4. **Hand Gestures & Interaction** - MediaPipe HandLandmarker + gesture classifier + particle force interaction
   - Addresses: Hand tracking, gesture recognition, push/attract/concentrate forces
   - Avoids: Running both models without the staggered inference optimization

5. **Polish & Performance** - Smooth transitions, UI overlay, performance tuning, cross-browser testing
   - Addresses: 30fps guarantee, emotion transitions, portfolio-quality finish
   - Avoids: Premature polish before core mechanics work

**Phase ordering rationale:**
- Camera must come first (everything depends on webcam feed)
- Face/emotion before particles because particles need emotion data to drive their behavior
- Particles before hand gestures because the gesture interaction manipulates particles
- Polish last because performance tuning requires all systems running together
- Each phase produces a visible, testable artifact (progressive demo)

**Research flags for phases:**
- Phase 2: Standard patterns, unlikely to need deeper research. MediaPipe FaceLandmarker API is well-documented.
- Phase 3: Creative development. May need research into specific GLSL techniques for organic/fluid effects.
- Phase 4: The staggered inference pattern (face on even frames, hand on odd frames) needs to be validated early in this phase for performance.
- Phase 5: Safari-specific WebGL performance may need investigation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Well-established ecosystem. MediaPipe + Three.js is the de facto standard for this type of project. |
| Features | HIGH | PROJECT.md is clear on requirements. Feature scope is well-defined and achievable. |
| Architecture | HIGH | render-loop + staggered-inference + GPU-particles is a proven pattern. |
| Pitfalls | HIGH | Common pitfalls for this domain are well-documented in community (performance, Safari, model loading). |
| Version numbers | MEDIUM | Based on training data up to ~May 2025. Versions should be verified at install time. |

## Gaps to Address

- Exact current versions of key packages (unable to verify with web access)
- Safari-specific MediaPipe performance in 2026 (may have improved since training data)
- Whether MediaPipe has released a stable 1.0 of tasks-vision by now
- WebGPU browser support status in Feb 2026 (may have matured enough to use directly)
- Specific GLSL techniques for the "organic/fluid" particle aesthetic will need phase-specific research during Phase 3
