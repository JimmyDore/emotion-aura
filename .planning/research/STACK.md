# Technology Stack

**Project:** Emotion Aura
**Researched:** 2026-02-06
**Research basis:** Training data (up to ~May 2025). WebSearch and WebFetch were unavailable during this research session. All version numbers should be verified at install time with `npm info <package> version`. Confidence levels reflect this limitation.

---

## Recommended Stack

### Build Tooling & Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vite** | ^6.x | Build tool, dev server, HMR | Fastest DX for vanilla TS/WebGL projects. Near-instant HMR. Native ESM. No framework lock-in. Vite 6 released Dec 2024 with Environment API improvements. | HIGH |
| **TypeScript** | ^5.7 | Type safety | Non-negotiable for a project mixing ML tensors, WebGL buffers, and gesture state machines. Catches dimension mismatches at compile time. TS 5.7 is current as of late 2024. | HIGH |
| **Vanilla (no React/Vue)** | N/A | No UI framework | This is a full-canvas WebGL experience, not a form-driven UI. A framework adds bundle weight and abstractions that fight against the requestAnimationFrame render loop. The only DOM needed is a few buttons and a canvas overlay. | HIGH |

**Why NOT Next.js / React / Vue:** These frameworks optimize for DOM-heavy UIs with state management. Emotion Aura is a real-time graphics app. React's reconciliation cycle (even with concurrent features) adds latency to the render loop. A thin vanilla TS layer with direct DOM manipulation for the sparse UI elements is both simpler and faster.

**Why NOT Webpack:** Vite is strictly superior for new projects in 2025+. Webpack's config complexity buys nothing here.

### Computer Vision & ML

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@mediapipe/tasks-vision** | ^0.10.x | Face landmarks + Hand landmarks | Google's unified Vision Tasks API. Single library handles both face mesh (478 landmarks) and hand tracking (21 landmarks per hand). Runs on GPU via WebGL/WebGPU delegates. This is THE standard for browser-based CV in 2025. | HIGH |

**Architecture note:** MediaPipe's tasks-vision package replaces the older fragmented packages (`@mediapipe/face_mesh`, `@mediapipe/hands`, etc.). The new unified API uses a single `VisionTaskRunner` that can be configured for multiple tasks. Use `FaceLandmarker` and `HandLandmarker` from this package.

**Why @mediapipe/tasks-vision specifically:**
- **Single package** for both face and hand detection (no dependency juggling)
- **478-point face mesh** provides the dense landmark coverage needed for emotion classification (eyebrow position, mouth shape, eye openness)
- **21-point hand skeleton** per hand provides finger joint positions for gesture recognition
- **GPU-accelerated** inference via WebGL delegate (falls back to CPU WASM)
- **~15-25ms inference time** per frame on modern hardware (leaves budget for rendering)
- Actively maintained by Google's MediaPipe team

**Why NOT face-api.js:**
- Last meaningful update was 2020. The npm package shows no releases in years.
- Based on TensorFlow.js face detection models that are now outperformed by MediaPipe.
- Does include a built-in emotion classifier, which is tempting, but the model quality is inferior to what you can build with MediaPipe landmarks + a custom classifier.
- Dead project. Do not depend on it.

**Why NOT TensorFlow.js directly:**
- TensorFlow.js is the underlying runtime MediaPipe uses, but using it directly means managing model loading, preprocessing, and postprocessing manually.
- MediaPipe wraps all of this in a clean task-oriented API.
- If you needed a custom model not covered by MediaPipe tasks, TFJS would be the right choice. For face landmarks + hand tracking, MediaPipe tasks-vision is the correct abstraction level.

**Why NOT OpenCV.js:**
- OpenCV.js is a WASM port of OpenCV. It's massive (~8MB) and designed for traditional CV (edge detection, contour finding), not ML-based landmark detection.
- For landmark-based face/hand tracking, MediaPipe is purpose-built and faster.

### Emotion Classification

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Custom rule-based classifier** | N/A | Map face landmarks to emotion labels | For the 5 emotions needed (happy, sad, angry, surprised, neutral), a geometric rule-based approach on MediaPipe's 478 landmarks is sufficient, deterministic, and adds zero bundle weight. | HIGH |
| **ONNX Runtime Web** (alternative) | ^1.19.x | Run a trained emotion model in browser | If rule-based is too coarse, a small ONNX model (~200KB) trained on landmark distances can run at <5ms per frame. ONNX Runtime Web supports WebGL and WebGPU backends. | MEDIUM |

**Recommended approach: Rule-based first, ML fallback.**

The 5 target emotions map cleanly to geometric features:
- **Happy:** Mouth corners raised (landmarks 61, 291 y-position relative to nose), cheeks raised
- **Sad:** Mouth corners lowered, inner eyebrows raised
- **Angry:** Eyebrows lowered and pinched (landmarks 65-70 distance), lips tightened
- **Surprised:** Mouth open wide (lip distance), eyebrows raised high, eyes wide
- **Neutral:** Baseline ratios, minimal deviation

This approach is fast (sub-millisecond), deterministic, debuggable, and requires no model loading. Start here. Only move to ONNX Runtime if the rule-based approach produces unsatisfying classifications.

**Why NOT a pre-trained emotion model from the start:**
- Adds model loading time (cold start)
- Adds bundle size
- The 5 emotions are geometrically distinct enough that rules work well
- A trained model might be needed for subtle emotions (contempt, disgust) but those are out of scope

### Rendering & Particle System

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Three.js** | ^0.172.x | WebGL abstraction, particle rendering | Industry standard WebGL library. THREE.Points + custom shaders gives full control over particle appearance. BufferGeometry + instanced rendering handles 10K-50K particles at 60fps. Three.js r172+ is current. | HIGH |
| **Custom GLSL shaders** | N/A | Organic particle appearance | Soft-edged, glowing particles with light trails require custom fragment shaders. Three.js ShaderMaterial makes this straightforward. | HIGH |
| **@tweenjs/tween.js** | ^25.x | Smooth transitions between emotion states | Lightweight tweening for color palettes, particle behavior parameters, and force field transitions. ~4KB gzipped. | MEDIUM |

**Why Three.js over alternatives:**

| Alternative | Why Not |
|-------------|---------|
| **Raw WebGL** | Would work but means writing your own matrix math, buffer management, shader pipeline, camera system. Three.js abstracts this without meaningful performance cost for this use case. |
| **PixiJS** | Optimized for 2D sprite rendering. Could do particles but lacks 3D camera, depth, and the shader flexibility needed for organic 3D-feeling effects. |
| **Babylon.js** | Full game engine. Much heavier than Three.js (~500KB vs ~150KB min+gzip for core). Overkill for a particle system. |
| **regl** | Minimal WebGL wrapper. Good for raw performance but no scene graph, no camera helpers, no built-in Points geometry. Too low-level for the development timeline. |
| **WebGPU (direct)** | The future, but browser support is still incomplete (Safari behind, Firefox experimental). For a portfolio piece that needs to work across browsers today, WebGL2 via Three.js is the safe choice. Three.js has a WebGPU renderer that can be opted into later. |

**Particle system architecture:**
- Use `THREE.BufferGeometry` with custom attributes (position, velocity, color, size, life, seed)
- Use `THREE.Points` with a `ShaderMaterial` for GPU-driven particle rendering
- Vertex shader: apply forces, update positions (GPU-side animation)
- Fragment shader: soft circular gradient with glow, additive blending
- Target: 20,000-50,000 particles (easily achievable at 60fps with this approach)

**Why NOT a particle library (three-nebula, three.quarks, etc.):**
- These libraries add abstraction over Three.js's already-clean Points API
- For the organic/fluid style needed, you want direct control over the GLSL shaders
- The force model (emotion-driven + hand-gesture-driven) is custom enough that a generic emitter API would fight you
- Roll your own particle system; it's the core of the project

### Hand Gesture Recognition

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Custom gesture classifier** | N/A | Map hand landmarks to gestures | 3 gestures (open, fist, pinch) are trivially classified from MediaPipe's 21 hand landmarks using finger extension ratios. No ML needed. | HIGH |

**Gesture detection logic:**
- **Open hand:** All 5 fingers extended (tip landmark y < PIP joint y for each finger, with thumb using x-axis)
- **Fist:** All fingers curled (tip landmark y > MCP joint y)
- **Pinch:** Thumb tip (landmark 4) distance to index tip (landmark 8) below threshold; other fingers partially curled

This is a solved problem with geometric heuristics. A state machine with debouncing (require gesture stable for ~150ms before triggering) prevents flickering.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **lil-gui** | ^0.20.x | Debug controls panel | During development: tweak particle params, force multipliers, emotion thresholds in real-time. Ship hidden behind a dev flag. | HIGH |
| **stats.js** | ^0.17.x | FPS/MS/MB performance monitor | Development only. Critical for maintaining the 30fps requirement. Shows exactly where frame budget is spent. | HIGH |
| **@mediapipe/tasks-vision** | ^0.10.x | (listed above) | Core dependency | HIGH |

**Why NOT dat.gui:** lil-gui is the maintained successor to dat.gui (same API, actively developed, smaller bundle).

### CSS & Styling

| Technology | Purpose | Why | Confidence |
|------------|---------|-----|------------|
| **Vanilla CSS** | Minimal UI styling | The app is 95% canvas. The remaining UI (start button, emotion label overlay, gesture indicator) needs maybe 100 lines of CSS. No framework warranted. | HIGH |
| **CSS custom properties** | Theme colors matching current emotion | `--aura-primary`, `--aura-secondary` etc. driven by JS to sync UI accent colors with the particle system palette. | HIGH |

**Why NOT Tailwind/CSS-in-JS:** Absolute overkill. The DOM surface area is approximately: 1 canvas, 1 video element, 3 overlay divs, 2 buttons. Write the CSS by hand.

---

## Full Stack Summary

```
Build:          Vite 6 + TypeScript 5.7
CV/ML:          @mediapipe/tasks-vision (face landmarks + hand landmarks)
Emotion:        Custom rule-based classifier on 478 face landmarks
Gestures:       Custom geometric classifier on 21 hand landmarks
Rendering:      Three.js (Points + custom GLSL ShaderMaterial)
Transitions:    @tweenjs/tween.js
Dev tools:      lil-gui + stats.js
UI:             Vanilla DOM + CSS custom properties
Hosting:        Static files (Vercel / Netlify / GitHub Pages)
```

---

## Alternatives Considered (Full Matrix)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build tool | Vite | Webpack, Parcel | Vite is faster, simpler config, native ESM. No contest for new projects. |
| Language | TypeScript | JavaScript | Type safety matters when mixing tensor shapes, WebGL buffers, landmark indices. |
| UI framework | Vanilla | React, Vue, Svelte | Canvas-dominant app. Framework adds latency to render loop, bundle bloat, and unnecessary abstraction. |
| Face/Hand ML | @mediapipe/tasks-vision | face-api.js, TensorFlow.js direct, OpenCV.js | MediaPipe is purpose-built, GPU-accelerated, actively maintained, and handles both tasks in one package. |
| Emotion detection | Rule-based classifier | Pre-trained CNN, face-api.js emotions | 5 geometrically distinct emotions don't need ML. Rules are faster, smaller, debuggable. |
| Gesture detection | Geometric heuristics | Trained gesture model | 3 gestures from landmark positions is trivial geometry. No training data or model needed. |
| 3D/Particles | Three.js | PixiJS, Babylon.js, raw WebGL, regl | Three.js hits the sweet spot: enough abstraction to be productive, enough control for custom shaders, small enough to be fast. |
| Particle library | Custom (own code) | three-nebula, three.quarks | The particle system IS the project. Custom force model (emotion + gesture) needs direct shader control. |
| Tweening | @tweenjs/tween.js | gsap, anime.js | Lightweight and sufficient. GSAP is powerful but heavy for parameter interpolation. |
| Debug GUI | lil-gui | dat.gui | lil-gui is the maintained fork of dat.gui. Same API, actively developed. |

---

## Installation

```bash
# Initialize project
npm create vite@latest emotion-aura -- --template vanilla-ts

# Core dependencies
npm install three @mediapipe/tasks-vision @tweenjs/tween.js

# Type definitions
npm install -D @types/three

# Dev tools (optional but strongly recommended)
npm install -D lil-gui stats.js
```

**Note on @mediapipe/tasks-vision:** This package requires loading model files (.tflite) at runtime. These are fetched from a CDN by default (https://storage.googleapis.com/mediapipe-models/). For production, consider self-hosting the model files to avoid CDN dependency. The FaceLandmarker model is ~4MB, HandLandmarker model is ~5MB.

**Verify versions at install time:** Since this research was conducted without live web access, run the following after installation to confirm versions:
```bash
npm ls --depth=0
```

---

## Performance Budget

Critical for the 30+ FPS requirement. Here's how the frame budget breaks down at 30fps (33ms per frame):

| Task | Budget | Notes |
|------|--------|-------|
| MediaPipe face inference | ~12-18ms | GPU-accelerated. Runs on WebGL delegate. |
| MediaPipe hand inference | ~8-12ms | Can run in parallel with face on separate GL context. |
| Emotion classification | <1ms | Rule-based, pure math. |
| Gesture classification | <1ms | Geometric, pure math. |
| Particle simulation (CPU side) | ~2-4ms | Update force buffers, write to GPU. |
| Particle rendering (GPU) | ~2-5ms | GPU-bound, depends on particle count. |
| **Total** | ~25-41ms | Tight at 30fps, comfortable at 24fps. |

**Key optimization strategies:**
1. **Stagger ML inference:** Don't run face AND hand detection every frame. Run face on even frames, hand on odd frames (effectively 15fps each, but interpolate between results). This halves ML cost.
2. **Use `requestVideoFrameCallback`** instead of `requestAnimationFrame` for webcam reading. Only process new video frames, don't reprocess stale ones.
3. **GPU particle simulation:** Move force calculations to the vertex shader using uniform buffers for emotion/gesture parameters. CPU only updates uniforms, not per-particle data.
4. **Resolution control:** Run MediaPipe on downscaled video (640x480 is sufficient for landmark detection, even if display is 1080p).

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| MediaPipe WASM/WebGL | Full | Full | Full (15.4+) | Full |
| WebGL2 | Full | Full | Full (15+) | Full |
| getUserMedia | Full | Full | Full | Full |
| requestVideoFrameCallback | Full | 132+ | 15.4+ | Full |
| SharedArrayBuffer (if needed) | Requires COOP/COEP headers | Same | Same | Same |

**Safari note:** MediaPipe tasks-vision works in Safari but historically has had slower WebGL delegate performance. Test early. The project spec says "desktop browsers only" which de-risks mobile Safari concerns.

**COOP/COEP headers:** If using SharedArrayBuffer for any WASM threading, the server must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Vite's dev server can be configured for this. Vercel/Netlify support these via headers config.

---

## Project Structure (Recommended)

```
emotion-aura/
  src/
    main.ts                    # Entry: init camera, start loop
    camera/
      webcam.ts                # getUserMedia, video element management
    ml/
      face-landmarker.ts       # MediaPipe FaceLandmarker wrapper
      hand-landmarker.ts       # MediaPipe HandLandmarker wrapper
      emotion-classifier.ts    # Rule-based emotion from landmarks
      gesture-classifier.ts    # Geometric gesture from hand landmarks
    particles/
      particle-system.ts       # Three.js Points + BufferGeometry
      shaders/
        particle.vert          # Vertex shader (forces, movement)
        particle.frag          # Fragment shader (soft glow, color)
      force-field.ts           # Emotion-driven + gesture-driven forces
      emotion-palettes.ts      # Color schemes per emotion
    scene/
      scene-manager.ts         # Three.js scene, camera, renderer setup
      render-loop.ts           # requestAnimationFrame orchestration
    ui/
      overlay.ts               # Emotion label, gesture indicator
      controls.ts              # lil-gui debug panel
    utils/
      smoothing.ts             # Exponential smoothing for landmarks
      state-machine.ts         # Gesture debouncing, emotion transitions
  public/
    models/                    # Self-hosted MediaPipe model files (optional)
  index.html
  vite.config.ts
  tsconfig.json
```

---

## Sources & Confidence Notes

| Claim | Confidence | Basis |
|-------|------------|-------|
| MediaPipe tasks-vision is the standard browser CV library | HIGH | Widely documented as of 2024-2025, Google-maintained, no credible competitor for this use case |
| @mediapipe/tasks-vision version ~0.10.x | MEDIUM | Was current as of early 2025; may have bumped to 0.11.x or even 1.0.x by Feb 2026. **Verify with `npm info @mediapipe/tasks-vision version`** |
| Three.js version ~0.172.x | MEDIUM | Three.js releases monthly; version was ~0.170 in early 2025. Likely higher by Feb 2026. **Verify with `npm info three version`** |
| Vite version 6.x | MEDIUM | Vite 6 released Nov/Dec 2024. Likely still current, possibly 6.x or 7.x by Feb 2026. **Verify.** |
| face-api.js is abandoned | HIGH | Last release was 2020. This has been consistently the case for years. |
| Rule-based emotion classification works for 5 basic emotions | HIGH | Well-established in the facial action coding system (FACS) literature. Geometric features for these emotions are unambiguous. |
| Three.js Points + ShaderMaterial performance for 20K-50K particles | HIGH | Standard approach, well-benchmarked by the Three.js community. |
| Performance budget estimates (ms per task) | MEDIUM | Based on published benchmarks from MediaPipe team and community reports. Actual numbers depend on hardware. |
| lil-gui as dat.gui successor | HIGH | Explicitly created as the maintained fork by the same ecosystem. |
| @tweenjs/tween.js version ~25.x | LOW | Version number uncertain. **Verify with `npm info @tweenjs/tween.js version`** |
| ONNX Runtime Web version ~1.19.x | LOW | Version number uncertain. Only relevant if rule-based emotion detection is insufficient. |
