# Emotion Aura

Real-time computer vision app that detects your facial emotions and hand gestures through the webcam, then visualizes them as an interactive GPU particle system -- entirely in the browser, no backend required.

**[Live Demo](https://emotionaura.jimmydore.fr)**

---

## How It Works

1. **MediaPipe** analyzes the webcam feed to extract 478 face landmarks, 52 facial blendshapes, and 21 hand landmarks per hand
2. A **rule-based classifier** maps blendshape activations to 5 emotions using FACS (Facial Action Coding System) weighted formulas
3. A **GPU particle system** (5,000 particles) renders a glowing aura around the face, with colors, motion, and intensity driven by the detected emotion
4. **Hand gestures** create force fields -- open palm pushes particles away, closed fist attracts them

---

## Features

### Emotion Detection
- **5 emotions** -- happy, sad, angry, surprised, neutral -- classified from 52 facial blendshapes
- **FACS-based rules** -- weighted combinations of Action Units (smile + cheek squint = happy, brow down + nose sneer = angry, etc.)
- **Temporal smoothing** -- exponential moving average (EMA, alpha=0.2) for fluid 1-2s transitions; faster decay (alpha=0.3) when the face disappears or is occluded by a hand

### GPU Particle System
- **5,000 particles** managed in a ring-buffer pool with pre-allocated Float32Arrays
- **Custom GLSL shaders** -- neon spark effect with triple-layer glow (bright core, energy halo, atmospheric outer reach) and simplex noise displacement for organic motion
- **Additive blending** for an ethereal, overbright neon aesthetic
- **Per-emotion visual profiles** -- each emotion has unique color palettes, movement direction, speed, angular spread, and noise amplitude:
  - Happy: gold/pink, upward, playful drift
  - Sad: blue tones, downward rain
  - Angry: red/orange, radial burst, chaotic turbulence
  - Surprised: cyan/yellow, fast radial explosion
  - Neutral: silver, gentle ambient float
- **Face-anchored spawning** -- particles emit from the FACE_OVAL landmarks (head silhouette outline)
- **Smooth transitions** -- profiles lerp and blend when emotions change

### Dual-Hand Gesture Interaction
- **2-hand simultaneous tracking** -- each hand detected and classified independently
- **Open hand** creates a repulsive force field; **closed fist** creates an attractive force field
- **300px influence radius** per hand with velocity cap to prevent extreme dual-force speeds
- **Visual feedback** -- aura circles show force field radius, per-hand gesture labels (L/R)
- **Stability filtering** -- 150ms debounce before activation, 300ms smooth decay when a hand leaves the frame

### Performance
- **Staggered inference** -- face detection runs on even frames, hand detection on odd frames, keeping rendering at 60fps while each ML model runs at ~30fps
- **Adaptive quality scaler** -- silently reduces particle count if FPS drops below 30 (minimum 300 particles)
- **WebGL context loss recovery** -- graceful handling of GPU context loss events
- **Zero-backend** -- everything runs client-side; models loaded from Google CDN

### UX
- Camera permission flow with clear explanation
- Loading screen with progress bar during model download (~10MB)
- Specific error screens (camera denied, unavailable, model loading failure)
- Mobile detection gate (desktop-optimized)
- Toggle controls for stats overlay and emotion/gesture HUD

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Language | **TypeScript** (strict mode) | Type-safe ML tensors, WebGL buffers, state machines |
| Build | **Vite** | Dev server with HMR, production tree-shaking |
| 3D / WebGL | **Three.js** + custom **GLSL** shaders | GPU particle rendering with simplex noise and neon glow |
| ML / Vision | **MediaPipe Tasks Vision** (WASM) | FaceLandmarker (478 points, 52 blendshapes) + HandLandmarker (21 points x2 hands) |
| Shaders | **vite-plugin-glsl** | Import `.glsl` files as ES modules |
| CI/CD | **GitHub Actions** + rsync | Auto-deploy to VPS with nginx on push to main |

---

## Architecture

```
src/
├── main.ts                      # Orchestration, render loop, staggered inference
├── camera/
│   └── CameraManager            # getUserMedia, video element management
├── ml/
│   ├── FaceDetector             # MediaPipe FaceLandmarker wrapper
│   ├── HandDetector             # MediaPipe HandLandmarker wrapper (2-hand)
│   ├── EmotionClassifier        # Blendshape → emotion (FACS rules)
│   ├── GestureClassifier        # Hand landmarks → open/fist/none
│   └── ModelLoader              # Model download with progress callback
├── particles/
│   ├── ParticleSystem           # Three.js Points mesh + custom ShaderMaterial
│   ├── ParticlePool             # Ring buffer, per-frame physics update
│   ├── EmotionProfile           # Color palettes & behavior configs per emotion
│   ├── FaceLandmarkTracker      # FACE_OVAL spawn point extraction
│   ├── QualityScaler            # Adaptive particle count based on FPS
│   └── shaders/
│       ├── particle.vert.glsl   # Simplex noise displacement, size scaling
│       ├── particle.frag.glsl   # Neon spark glow (core + halo + outer)
│       └── noise3d.glsl         # 3D simplex noise function
├── scene/
│   └── SceneManager             # Three.js scene, camera, renderer setup
├── state/
│   ├── EmotionState             # EMA score smoothing + face-loss decay
│   └── GestureState             # Gesture stability debounce + decay FSM
├── ui/
│   ├── PermissionScreen         # Camera permission request
│   ├── LoadingScreen            # Model download progress bar
│   ├── ErrorScreen              # Error display with recovery hints
│   ├── MobileGate               # Mobile device warning
│   ├── EmotionOverlay           # Emotion scores HUD (top-right)
│   └── GestureOverlay           # Hand gesture labels HUD (top-left)
└── core/
    ├── types.ts                 # Shared TypeScript interfaces
    └── constants.ts             # FACS weights, thresholds, model URLs
```

---

## Technical Highlights

**Emotion classification** is rule-based, not ML -- each emotion maps to weighted combinations of MediaPipe's 52 blendshape coefficients (e.g. happy = `mouthSmileLeft * 0.35 + mouthSmileRight * 0.35 + cheekSquintLeft * 0.15 + cheekSquintRight * 0.15`). This gives sub-millisecond classification, deterministic behavior, and zero additional model weight.

**The particle fragment shader** creates the neon spark effect using three exponential falloff layers composited with additive blending:
```glsl
float core  = exp(-dist * 12.0);       // bright center spark
float halo  = exp(-dist * 4.0) * 0.5;  // energy halo
float outer = exp(-dist * 1.5) * 0.15; // atmospheric glow
```

**Staggered inference** is the key performance trick -- running both MediaPipe models every frame tanks FPS to ~20. By alternating face/hand detection across frames, each model runs at 30fps while rendering stays at 60fps. Users can't perceive the 33ms ML latency with smooth visual output.

**Gesture force fields** apply radial forces to every alive particle each frame. Both hands can act simultaneously -- you can push with one hand and attract with the other. A velocity cap prevents particles from accelerating infinitely under combined dual-hand forces.

---

## Development

```bash
npm install
npm run dev
```

Production build:
```bash
npm run build   # outputs to dist/
```

Deployment is automated -- every push to `main` triggers a GitHub Actions workflow that builds and rsyncs to the VPS.
