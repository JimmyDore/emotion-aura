# Architecture Patterns

**Project:** Emotion Aura
**Domain:** Real-time browser-based computer vision with ML inference and WebGL rendering
**Researched:** 2026-02-06
**Overall Confidence:** MEDIUM-HIGH (based on training knowledge of well-established APIs; WebSearch/WebFetch unavailable for version verification)

---

## Recommended Architecture

### High-Level Overview

The application is a **single-page client-side app** with a real-time processing pipeline. The architecture follows a **producer-consumer pipeline** pattern where raw video frames flow through ML inference stages, producing structured data that drives a WebGL particle renderer.

```
+-------------------+     +---------------------+     +-------------------+
|   Capture Layer   | --> |   ML Inference Layer | --> |   Render Layer    |
|                   |     |                      |     |                   |
| - getUserMedia    |     | - Face Landmarker    |     | - Three.js Scene  |
| - Video element   |     | - Hand Landmarker    |     | - Particle System |
| - Frame provider  |     | - Emotion Classifier |     | - Post-processing |
|                   |     | - Gesture Recognizer |     | - UI Overlay      |
+-------------------+     +---------------------+     +-------------------+
         |                          |                          ^
         |                          v                          |
         |                 +------------------+                |
         +---------------> |   State Manager  | ---------------+
                           |                  |
                           | - Current emotion |
                           | - Hand positions  |
                           | - Active gesture  |
                           | - Transition state|
                           +------------------+
```

**Key architectural principle:** The ML layer and the render layer operate at potentially different frame rates. ML inference (especially on lower-end hardware) may run at 15-20 FPS while the particle renderer must maintain 30-60 FPS. The State Manager decouples these two rates via interpolation.

---

## Component Boundaries

### 1. Capture Layer

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Acquire webcam frames, manage camera lifecycle |
| **Input** | User permission grant |
| **Output** | HTMLVideoElement with live stream, frame timestamps |
| **Communicates with** | ML Inference Layer (passes video element reference) |

**Internal structure:**
- `CameraManager` - Handles `getUserMedia()`, stream start/stop, error recovery
- Negotiates resolution (target 640x480 for ML performance; display can be larger via CSS)
- Manages camera lifecycle: permission request, stream acquisition, cleanup on unmount

**Key decisions:**
- Request **640x480** resolution. MediaPipe runs inference on downscaled frames anyway; higher resolution wastes bandwidth without improving ML accuracy. The video element can be CSS-scaled for display.
- Use `{ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }` constraints.
- The video element itself acts as the frame source -- MediaPipe accepts an HTMLVideoElement directly, no need to manually extract ImageData.

**Confidence:** HIGH -- getUserMedia and video element APIs are stable web standards.

---

### 2. ML Inference Layer

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Run face and hand landmark detection, classify emotion, recognize gestures |
| **Input** | HTMLVideoElement reference (from Capture Layer) |
| **Output** | Structured landmark data, emotion classification, gesture state |
| **Communicates with** | State Manager (pushes results), Capture Layer (reads video frames) |

**Internal structure:**

#### 2a. Face Landmarker
- Uses `@mediapipe/tasks-vision` FaceLandmarker
- Configured with `runningMode: "VIDEO"` for continuous frame processing
- Extracts 478 face mesh landmarks per frame
- Outputs: `FaceLandmarkerResult` with `faceLandmarks`, `faceBlendshapes` (if available)

#### 2b. Hand Landmarker
- Uses `@mediapipe/tasks-vision` HandLandmarker
- Configured with `runningMode: "VIDEO"`, `numHands: 2`
- Extracts 21 hand landmarks per detected hand
- Outputs: `HandLandmarkerResult` with `landmarks`, `handedness`

#### 2c. Emotion Classifier
- **Custom logic layer** -- NOT a separate ML model
- Takes face landmarks (and ideally blendshapes) as input
- Classifies into: happy, sad, angry, surprised, neutral
- Two approaches (recommend Option A):

  **Option A: Blendshape-based (recommended)**
  MediaPipe FaceLandmarker can output 52 blendshape coefficients (ARKit-compatible) when configured with `outputFaceBlendshapes: true`. These directly encode facial action units:
  - `mouthSmileLeft/Right` > threshold --> happy
  - `browDownLeft/Right` + `mouthFrownLeft/Right` --> angry
  - `jawOpen` + `browInnerUp` --> surprised
  - `mouthFrownLeft/Right` without brow tension --> sad
  - Low activation across all --> neutral

  This is a **rule-based classifier using geometric features**, not a neural network. It's fast (<1ms per frame), interpretable, and good enough for this use case.

  **Option B: Landmark geometry-based (fallback)**
  If blendshapes aren't available or accurate enough, compute distances/ratios between key landmarks:
  - Mouth aspect ratio (width vs height)
  - Eye openness ratio
  - Brow position relative to eye center
  - Jawline tension

  More manual tuning required, but no additional model dependency.

**Why NOT face-api.js:** face-api.js is based on older TensorFlow.js models and would add a second ML framework alongside MediaPipe. The blendshape approach achieves emotion detection with zero additional model loading, using data MediaPipe already produces.

#### 2d. Gesture Recognizer
- **Custom logic layer** built on hand landmark positions
- Takes hand landmarks as input
- Classifies into: open_hand, fist, pinch, none
- Logic:
  - **Open hand:** All fingertip landmarks are extended (above their respective MCP joints, accounting for hand orientation)
  - **Fist:** All fingertip landmarks are curled (below PIP joints)
  - **Pinch:** Thumb tip to index finger tip distance below threshold
- Also computes: hand center position (normalized 0-1 in frame), hand velocity (for gesture force)

**Confidence:** HIGH for MediaPipe Face/Hand Landmarker APIs (well-established, widely documented). MEDIUM for blendshape-based emotion classification (the blendshape output exists, but tuning thresholds requires experimentation). HIGH for geometric gesture recognition (standard approach).

---

### 3. State Manager

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Smooth raw ML outputs, manage transitions, provide stable state for renderer |
| **Input** | Raw ML results (landmarks, emotion, gesture) |
| **Output** | Smoothed/interpolated state for render layer |
| **Communicates with** | ML Layer (receives data), Render Layer (provides state) |

**Why this component exists:** Raw ML output is noisy. Emotion classification may flicker between "happy" and "neutral" frame-to-frame. Hand positions jitter. Without smoothing, the particle system would visually stutter. The State Manager is the critical decoupling layer.

**Internal structure:**

#### 3a. Emotion State
```typescript
interface EmotionState {
  current: EmotionType;           // Dominant emotion
  confidence: number;             // 0-1 confidence
  scores: Record<EmotionType, number>; // All emotion scores (smoothed)
  transitionProgress: number;     // 0-1 progress toward new emotion
  previous: EmotionType;          // For blending during transitions
}
```
- Applies **exponential moving average** to raw emotion scores
- Requires emotion to be dominant for N consecutive frames (e.g., 10 frames ~ 333ms at 30fps) before transitioning
- During transition, provides `transitionProgress` for the renderer to blend particle styles

#### 3b. Hand State
```typescript
interface HandState {
  detected: boolean;
  position: { x: number; y: number };  // Smoothed, normalized 0-1
  gesture: GestureType;
  gestureStrength: number;              // 0-1 for proportional effects
  velocity: { x: number; y: number };   // For momentum-based interactions
}
```
- Applies **low-pass filter** (simple lerp) to hand position: `smoothed = lerp(smoothed, raw, 0.3)`
- Gesture requires 3+ consecutive frames of same classification to activate (debouncing)
- Velocity computed from position delta / time delta

#### 3c. Frame Rate Decoupling
- ML results arrive at ML inference rate (potentially 15-20 FPS)
- Renderer reads state at render rate (60 FPS)
- State Manager interpolates between ML updates so the renderer always sees smooth values
- Stores timestamp of last ML update; renderer-side reads interpolate based on elapsed time

**Confidence:** HIGH -- this is a standard real-time systems pattern (producer-consumer with interpolation).

---

### 4. Render Layer

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Draw particle system, composite with video, handle post-processing |
| **Input** | Smoothed state from State Manager |
| **Output** | Visual output on screen |
| **Communicates with** | State Manager (reads state), Browser compositing (final display) |

**Internal structure:**

#### 4a. Three.js Scene Setup
- Single `WebGLRenderer` with `alpha: true` (transparent background)
- Canvas overlaid on video element via CSS `position: absolute`
- Orthographic camera (2D particle effects overlaid on video, not 3D perspective)
- Alternatively: perspective camera if wanting depth-of-field effects on particles

#### 4b. Particle System
- **Approach: GPU-based particle system using Three.js `Points` or `InstancedMesh`**
- Each particle: position (vec3), velocity (vec3), color (vec4), life (float), size (float)
- Particle count target: 2000-5000 (tunable based on performance)
- Update loop:
  1. Read current emotion state --> determine particle behavior profile (colors, speeds, patterns)
  2. Read hand state --> apply force fields (push/attract/concentrate)
  3. Update particle positions (GPU-side via custom ShaderMaterial or CPU-side via BufferGeometry attribute updates)
  4. Kill expired particles, spawn new ones

- **Emotion-to-particle mapping** (behavior profiles):
  | Emotion | Colors | Movement | Spawn Pattern | Special |
  |---------|--------|----------|---------------|---------|
  | Happy | Warm yellows, oranges, pinks | Upward drift, gentle oscillation | Radial from face | Sparkle/twinkle |
  | Sad | Blues, teals, grays | Downward drift, slow | Rain-like from top | Trails |
  | Angry | Reds, oranges, dark yellows | Fast, chaotic, outward | Burst from face edges | Flicker/pulse |
  | Surprised | White, bright colors | Fast outward burst | Explosion from center | Flash on trigger |
  | Neutral | Soft whites, light blues | Slow ambient float | Gentle ambient | Subtle glow |

#### 4c. Force Fields (Gesture Interaction)
- **Open hand = repulsion field:** Particles within radius R of hand position are pushed away. Force proportional to `gestureStrength / distance`.
- **Fist = attraction field:** Particles pulled toward hand position. Same force model, reversed direction.
- **Pinch = concentration:** Particles within radius R are pulled to exact hand position with strong force + their size decreases (visual concentration effect).
- Hand position is mapped from normalized MediaPipe coordinates (0-1) to canvas/scene coordinates.

#### 4d. Post-Processing (optional, performance-permitting)
- Bloom pass (`UnrealBloomPass` from Three.js examples) for glow effect
- Only enable if FPS stays above 30 with it on
- Can be toggled at runtime based on performance monitoring

#### 4e. Performance Monitor
- Tracks rolling FPS average
- If FPS drops below 28:
  1. Reduce particle count by 20%
  2. Disable post-processing
  3. Reduce ML inference frequency (skip every other frame)
- If FPS recovers above 35: gradually restore quality

**Confidence:** HIGH for Three.js particle approach (standard, well-documented). MEDIUM for specific shader techniques (require implementation tuning). HIGH for force field math (basic physics).

---

### 5. Main Loop / Orchestrator

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Coordinate the per-frame pipeline, manage timing |
| **Input** | `requestAnimationFrame` callback |
| **Output** | Triggers ML inference and render updates |
| **Communicates with** | All layers |

**The render loop is the heartbeat of the application.**

```typescript
// Pseudocode for main loop
function mainLoop(timestamp: number) {
  requestAnimationFrame(mainLoop);

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // 1. ML Inference (throttled)
  if (timestamp - lastInferenceTime > inferenceInterval) {
    const faceLandmarks = faceLandmarker.detectForVideo(video, timestamp);
    const handLandmarks = handLandmarker.detectForVideo(video, timestamp);

    const emotion = emotionClassifier.classify(faceLandmarks);
    const gesture = gestureRecognizer.recognize(handLandmarks);

    stateManager.update(emotion, gesture, timestamp);
    lastInferenceTime = timestamp;
  }

  // 2. Read smoothed state (always, every frame)
  const state = stateManager.getInterpolatedState(timestamp);

  // 3. Update particles (always, every frame)
  particleSystem.update(state, delta);

  // 4. Render (always, every frame)
  renderer.render(scene, camera);

  // 5. Performance tracking
  performanceMonitor.recordFrame(timestamp);
}
```

**Critical insight: ML inference and rendering are NOT on separate threads** (unless using Web Workers -- see Scalability section). They share the main thread. The loop must be structured so that ML inference is **throttled** (e.g., every 33ms = ~30fps inference) while rendering runs at full `requestAnimationFrame` rate (typically 60fps). This means:
- 60 render frames per second
- 30 ML inference calls per second (every other frame)
- State interpolation bridges the gap

**Confidence:** HIGH -- this is the standard pattern for browser-based real-time apps.

---

### 6. UI Layer

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Permission prompts, loading states, debug overlays, controls |
| **Input** | User interactions, application state |
| **Output** | DOM-based UI overlaid on canvas |
| **Communicates with** | Capture Layer (permission flow), State Manager (debug display) |

**Components:**
- **Permission screen:** "Allow camera access" prompt with explanation
- **Loading screen:** Model download progress (MediaPipe models are ~5-10MB)
- **Debug overlay** (dev mode): FPS counter, current emotion/confidence, hand position, landmark visualization
- **Minimal production UI:** Possibly just a small info icon and fullscreen toggle

---

## Data Flow

### Frame-by-Frame Data Flow

```
                    getUserMedia
                         |
                         v
                  [HTMLVideoElement]
                    |           |
                    v           v
            FaceLandmarker  HandLandmarker      <-- ML inference (throttled)
                    |           |
                    v           v
            [478 landmarks] [21 landmarks x N hands]
                    |           |
                    v           v
          EmotionClassifier  GestureRecognizer  <-- Classification (sub-1ms)
                    |           |
                    v           v
            {emotion, conf}  {gesture, pos, vel}
                    |           |
                    +-----+-----+
                          |
                          v
                    [State Manager]              <-- Smoothing + interpolation
                          |
                          v
                    {smoothed state}
                     /          \
                    v            v
            [Particle System]  [Force Fields]   <-- Physics update (every frame)
                     \          /
                      v        v
                    [Three.js Render]            <-- GPU draw call (every frame)
                          |
                          v
                    [Screen Output]
```

### Data Shape at Each Stage

```typescript
// Stage 1: Raw ML Output
interface RawFaceResult {
  landmarks: Array<{ x: number; y: number; z: number }>; // 478 points
  blendshapes?: Array<{ categoryName: string; score: number }>; // 52 categories
}

interface RawHandResult {
  landmarks: Array<{ x: number; y: number; z: number }>; // 21 points per hand
  handedness: 'Left' | 'Right';
}

// Stage 2: Classification Output
interface EmotionResult {
  emotion: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';
  confidence: number;
  allScores: Record<string, number>;
}

interface GestureResult {
  gesture: 'open_hand' | 'fist' | 'pinch' | 'none';
  handPosition: { x: number; y: number }; // normalized 0-1
  strength: number; // 0-1
}

// Stage 3: Smoothed State (consumed by renderer)
interface AppState {
  emotion: EmotionState;
  hands: HandState[];
  fps: number;
  qualityLevel: 'high' | 'medium' | 'low';
}
```

### Timing Diagram (60fps render, 30fps inference)

```
Frame:  1    2    3    4    5    6    7    8    ...
        |    |    |    |    |    |    |    |
ML:     X         X         X         X        (every ~33ms)
Render: X    X    X    X    X    X    X    X    (every ~16ms)
State:  U    I    U    I    U    I    U    I    (U=update, I=interpolate)
```

---

## Scalability Considerations

### Web Worker Strategy (Optional, for Lower-End Hardware)

If ML inference on the main thread causes frame drops:

```
Main Thread                    Worker Thread
+------------------+          +-------------------+
| Render Loop      |          | ML Inference      |
| - Read state     |  <----   | - FaceLandmarker  |
| - Update physics | postMsg  | - HandLandmarker  |
| - Three.js render|  ---->   | - Classify/Recog  |
+------------------+  video   +-------------------+
                      frame
                      (OffscreenCanvas or
                       ImageBitmap transfer)
```

**Caveat:** Transferring video frames to a Worker requires `OffscreenCanvas` or `createImageBitmap()`. MediaPipe may or may not support running inside a Web Worker -- this needs verification during implementation. As of training data, MediaPipe Tasks Vision uses WebGL internally for inference, which historically had constraints in Worker contexts.

**Recommendation:** Start WITHOUT Web Workers. The main-thread approach with throttled inference is the standard pattern and is simpler to debug. Only add Worker-based inference if performance testing reveals it's necessary on target hardware.

**Confidence:** MEDIUM -- Web Worker + MediaPipe compatibility needs runtime verification.

### Performance Tiers

| Hardware | Expected FPS | ML Rate | Particles | Post-FX |
|----------|-------------|---------|-----------|---------|
| High-end (M1+, RTX 3060+) | 60 | 30fps | 5000 | Bloom on |
| Mid-range (2020 laptop) | 45-60 | 20fps | 3000 | Bloom off |
| Low-end (2018 laptop) | 30-40 | 15fps | 1500 | All off |

The Performance Monitor component dynamically adjusts these parameters at runtime.

---

## Patterns to Follow

### Pattern 1: Frame-Rate Decoupled Pipeline

**What:** ML inference and visual rendering run at independent rates, connected by an interpolation layer.

**When:** Any time a slow producer (ML) feeds a fast consumer (renderer).

**Why:** MediaPipe face + hand inference may take 20-40ms per frame. At 60fps, each frame budget is 16.6ms. Running inference every frame would blow the budget. Decoupling lets the renderer maintain smooth visuals while ML runs at whatever rate the hardware allows.

**Example:**
```typescript
class StateManager {
  private lastMLTimestamp = 0;
  private currentState: AppState;
  private previousState: AppState;

  updateFromML(emotion: EmotionResult, gesture: GestureResult, timestamp: number) {
    this.previousState = { ...this.currentState };
    this.currentState = this.computeSmoothedState(emotion, gesture);
    this.lastMLTimestamp = timestamp;
  }

  getInterpolatedState(renderTimestamp: number): AppState {
    // Interpolate between last two ML states based on time elapsed
    const elapsed = renderTimestamp - this.lastMLTimestamp;
    const t = Math.min(elapsed / this.inferenceInterval, 1.0);
    return this.lerpState(this.previousState, this.currentState, t);
  }
}
```

### Pattern 2: Behavior Profiles for Emotion Mapping

**What:** Each emotion defines a behavior profile (a configuration object) rather than hardcoded if/else branches.

**When:** Mapping categorical state (emotion) to continuous visual parameters (particle behavior).

**Why:** Data-driven approach makes it trivial to add/tune emotions without touching particle physics code.

**Example:**
```typescript
interface ParticleBehaviorProfile {
  colors: [number, number, number][];  // Array of RGB triplets
  spawnRate: number;                    // Particles per second
  initialVelocity: { min: number; max: number; direction: 'up' | 'down' | 'radial' | 'random' };
  lifetime: { min: number; max: number };
  size: { min: number; max: number };
  turbulence: number;                   // 0 = straight lines, 1 = chaotic
  gravity: number;                      // Negative = float up
  trailLength: number;                  // 0 = no trail
}

const EMOTION_PROFILES: Record<EmotionType, ParticleBehaviorProfile> = {
  happy: {
    colors: [[1, 0.8, 0.2], [1, 0.5, 0.3], [1, 0.6, 0.7]],
    spawnRate: 150,
    initialVelocity: { min: 0.5, max: 2.0, direction: 'radial' },
    lifetime: { min: 1.0, max: 3.0 },
    size: { min: 3, max: 8 },
    turbulence: 0.3,
    gravity: -0.2,
    trailLength: 0,
  },
  sad: {
    colors: [[0.3, 0.4, 0.8], [0.2, 0.5, 0.7], [0.5, 0.5, 0.6]],
    spawnRate: 80,
    initialVelocity: { min: 0.1, max: 0.5, direction: 'down' },
    lifetime: { min: 2.0, max: 5.0 },
    size: { min: 2, max: 5 },
    turbulence: 0.1,
    gravity: 0.3,
    trailLength: 0.5,
  },
  // ... other emotions
};
```

### Pattern 3: Adaptive Quality System

**What:** Monitor real-time FPS and dynamically adjust quality parameters.

**When:** Performance-sensitive applications that must maintain a minimum frame rate.

**Why:** Users have wildly different hardware. A fixed quality setting either looks bad on high-end or stutters on low-end.

**Example:**
```typescript
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private qualityLevel: 'high' | 'medium' | 'low' = 'high';

  recordFrame(timestamp: number) {
    this.frameTimes.push(timestamp);
    if (this.frameTimes.length > 60) this.frameTimes.shift();

    const avgFPS = this.calculateFPS();

    if (avgFPS < 28 && this.qualityLevel !== 'low') {
      this.downgrade();
    } else if (avgFPS > 45 && this.qualityLevel !== 'high') {
      this.upgrade();
    }
  }

  private downgrade() {
    // Reduce particle count, disable post-processing, throttle ML
  }

  private upgrade() {
    // Restore particle count, enable post-processing
  }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: ML Inference Every Render Frame

**What:** Calling `faceLandmarker.detectForVideo()` inside every `requestAnimationFrame` callback without throttling.

**Why bad:** Each ML inference call takes 20-40ms. At 60fps, the frame budget is 16.6ms. Running inference every frame guarantees frame drops, stuttering, and potentially <15fps output. The app becomes unusable.

**Instead:** Throttle inference to every other frame (30fps) or every third frame (20fps). Use state interpolation to keep visuals smooth between inference frames.

### Anti-Pattern 2: Synchronous Model Loading

**What:** Loading MediaPipe models (WASM + model files) synchronously or without progress indication.

**Why bad:** MediaPipe model files are 5-10MB total. On slow connections, the page appears frozen for 10-30 seconds with no feedback. Users will close the tab.

**Instead:** Load models asynchronously with a loading screen showing progress. Initialize camera permission request in parallel with model loading (they're independent).

### Anti-Pattern 3: CPU-Side Particle Updates with Large Counts

**What:** Updating 5000+ particle positions in JavaScript and uploading new positions to the GPU every frame via `BufferGeometry.attributes.position.needsUpdate = true`.

**Why bad:** JavaScript isn't fast enough for 5000 position calculations + velocity + force fields at 60fps. The CPU-to-GPU data transfer each frame adds overhead.

**Instead:** Use custom vertex shaders for particle physics. Store particle state in buffer attributes, update positions in the vertex shader using uniforms for force field parameters. The GPU handles parallel particle computation naturally. Alternatively, use a compute-shader approach via `GPUComputationRenderer` (Three.js example) for particle physics.

**Pragmatic note:** For 2000-3000 particles, CPU-side updates ARE fast enough on modern hardware. Start with CPU-side updates (simpler to implement and debug), and only move to GPU-side if performance demands it.

### Anti-Pattern 4: Direct State Mutation from ML Callbacks

**What:** Having ML inference results directly modify particle system state without smoothing.

**Why bad:** ML results are noisy. Frame N says "happy" (confidence 0.6), frame N+1 says "neutral" (confidence 0.55), frame N+2 says "happy" again. Without smoothing, the particle system constantly flickers between emotion states. Same issue with hand position jitter.

**Instead:** Always route ML results through the State Manager for smoothing, debouncing, and interpolation. The renderer should NEVER read raw ML output directly.

### Anti-Pattern 5: Monolithic Render Function

**What:** A single giant function that does camera capture, ML inference, emotion classification, gesture recognition, particle updates, and rendering.

**Why bad:** Impossible to test individual components. Cannot throttle ML independently from rendering. Cannot swap implementations (e.g., different particle renderers). Cannot profile where time is spent.

**Instead:** Separate concerns into distinct classes/modules with clear interfaces. The main loop orchestrates them but each component is independently testable.

---

## File Structure Recommendation

```
src/
  main.ts                    # Entry point, initializes app

  capture/
    CameraManager.ts         # getUserMedia, stream lifecycle

  ml/
    FaceLandmarkerService.ts  # MediaPipe face landmark wrapper
    HandLandmarkerService.ts  # MediaPipe hand landmark wrapper
    EmotionClassifier.ts      # Landmark/blendshape -> emotion
    GestureRecognizer.ts      # Hand landmarks -> gesture

  state/
    StateManager.ts           # Smoothing, interpolation, transitions
    EmotionState.ts           # Emotion-specific state logic
    HandState.ts              # Hand-specific state logic

  render/
    SceneManager.ts           # Three.js scene setup, camera, renderer
    ParticleSystem.ts         # Particle lifecycle, physics, spawn/kill
    EmotionProfiles.ts        # Behavior profile configurations (data)
    ForceFields.ts            # Gesture -> force field math
    PostProcessing.ts         # Bloom, glow effects

  ui/
    PermissionScreen.ts       # Camera permission flow
    LoadingScreen.ts          # Model loading progress
    DebugOverlay.ts           # FPS, emotion, landmarks display

  core/
    MainLoop.ts               # requestAnimationFrame orchestrator
    PerformanceMonitor.ts     # FPS tracking, quality adjustment
    types.ts                  # Shared TypeScript interfaces
    constants.ts              # Magic numbers, thresholds, configs
```

---

## Suggested Build Order

The build order is driven by **dependency chains** and **testability at each stage**.

### Phase 1: Foundation (Camera + Display)
**Build:** `CameraManager`, basic HTML/CSS layout, video element display
**Why first:** Everything depends on having a working video feed. This validates camera permissions, browser compatibility, and gives a visual baseline.
**Testable output:** Webcam feed visible in browser.

### Phase 2: ML Pipeline (Landmarks)
**Build:** `FaceLandmarkerService`, `HandLandmarkerService`, `DebugOverlay` (landmark visualization)
**Why second:** ML inference is the core technical risk. If MediaPipe doesn't perform well enough, the architecture needs to change. Test this early.
**Depends on:** Phase 1 (needs video element)
**Testable output:** Landmark dots overlaid on video feed in real-time.

### Phase 3: Classification Layer
**Build:** `EmotionClassifier`, `GestureRecognizer`
**Why third:** These are pure-function layers that transform landmarks into semantic meaning. Fast to build, easy to test, and needed before any visual response can be built.
**Depends on:** Phase 2 (needs landmark data)
**Testable output:** Debug overlay shows detected emotion and gesture labels updating in real-time.

### Phase 4: State Management
**Build:** `StateManager`, `EmotionState`, `HandState`, smoothing/interpolation logic
**Why fourth:** This is the critical quality layer between ML and rendering. Building it before the particle system means the renderer gets clean, smooth data from day one.
**Depends on:** Phase 3 (needs classification output)
**Testable output:** Debug overlay shows smooth emotion transitions, stable hand positions without jitter.

### Phase 5: Particle Renderer (Basic)
**Build:** `SceneManager`, `ParticleSystem` (basic spawn/move/kill), Three.js setup
**Why fifth:** Now we have stable state to drive visuals. Start with a simple particle system that responds to emotion state (color/behavior changes) without gesture interaction.
**Depends on:** Phase 4 (needs smoothed state)
**Testable output:** Particles visible on screen that change behavior with detected emotion.

### Phase 6: Gesture Interaction
**Build:** `ForceFields`, gesture-to-particle interaction
**Why sixth:** Gesture interaction is an enhancement on the base particle system. Having particles working first means you can see the force fields' effect immediately.
**Depends on:** Phase 5 (needs particle system), Phase 4 (needs hand state)
**Testable output:** Hand gestures visibly affect particle movement.

### Phase 7: Polish
**Build:** `PostProcessing`, `PerformanceMonitor`, quality presets, emotion transition animations, UI polish
**Why last:** Polish is meaningless without the core working. Performance monitoring and adaptive quality need the full pipeline running to be testable.
**Depends on:** All previous phases
**Testable output:** Smooth 30+ FPS experience with visual polish.

### Dependency Graph

```
Phase 1: Camera
    |
    v
Phase 2: ML Landmarks
    |
    v
Phase 3: Classification
    |
    v
Phase 4: State Management
    |         \
    v          v
Phase 5: Particles    Phase 6: Gestures
    |         /
    v        v
Phase 7: Polish
```

---

## Technology Integration Notes

### MediaPipe Tasks Vision (Critical)

The project should use `@mediapipe/tasks-vision`, which is the current (as of training) recommended package for browser-based MediaPipe. This replaces the older `@mediapipe/face_mesh` and `@mediapipe/hands` packages.

Key initialization pattern:
```typescript
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Load WASM runtime first (shared between face and hand)
const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
);

// Initialize both landmarkers
const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,  // Critical for emotion detection
});

const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numHands: 2,
});
```

**Important:** Both landmarkers can share the same WASM runtime (`FilesetResolver`), which avoids loading WASM twice.

**Confidence:** MEDIUM-HIGH -- API shape is well-established but exact model URLs and package versions should be verified against current npm/CDN at implementation time.

### Three.js Integration

Use Three.js for the particle renderer. It provides:
- `WebGLRenderer` with alpha transparency (overlay on video)
- `BufferGeometry` + `Points` for efficient particle rendering
- `ShaderMaterial` for custom particle appearance (soft circles, glow)
- Post-processing via `EffectComposer` + `UnrealBloomPass`

**Version note:** Verify current Three.js version at implementation time. The project should use the latest stable release. Three.js has moved to ES modules and may require specific import patterns.

**Confidence:** HIGH -- Three.js particle rendering is extremely well-documented and stable.

---

## Sources and Confidence Notes

| Claim | Confidence | Source |
|-------|-----------|--------|
| MediaPipe Tasks Vision API shape | MEDIUM-HIGH | Training data (widely documented, stable API); verify package version at build time |
| FaceLandmarker outputs blendshapes | MEDIUM-HIGH | Training data; verify `outputFaceBlendshapes` option exists in current version |
| 478 face landmarks, 21 hand landmarks | HIGH | Well-established MediaPipe specification |
| Three.js Points/BufferGeometry for particles | HIGH | Standard Three.js pattern, extremely well-documented |
| requestAnimationFrame render loop pattern | HIGH | Web platform standard |
| Throttled ML inference pattern | HIGH | Standard real-time systems approach |
| State interpolation for frame-rate decoupling | HIGH | Standard real-time systems approach |
| Blendshape-based emotion classification | MEDIUM | Approach is sound; threshold tuning requires experimentation |
| Web Worker + MediaPipe compatibility | LOW-MEDIUM | Needs runtime verification; MediaPipe uses WebGL internally which may complicate Worker usage |
| Model file sizes (~5-10MB) | MEDIUM | Approximate from training data; verify at implementation time |

**Key items to verify at implementation time:**
1. Exact `@mediapipe/tasks-vision` package version and any breaking changes
2. Whether `outputFaceBlendshapes` is fully supported and which blendshape names are available
3. Current Three.js version and import patterns
4. MediaPipe model CDN URLs (may have updated)
