# Phase 2: Emotion Detection - Research

**Researched:** 2026-02-06
**Domain:** MediaPipe FaceLandmarker integration + rule-based emotion classification from face blendshapes
**Confidence:** HIGH

## Summary

This phase integrates MediaPipe FaceLandmarker for real-time face detection and builds a rule-based emotion classifier on top of the 52 ARKit-compatible blendshapes that FaceLandmarker outputs. The Phase 1 foundation already downloads the face model as a `Uint8Array` (via `ModelLoader.getFaceModelBuffer()`) and provides the WASM CDN path, so this phase focuses on: (1) initializing FaceLandmarker from the pre-downloaded buffer, (2) running per-frame inference in VIDEO mode, (3) classifying emotions from blendshape scores using geometric rules, (4) smoothing the output via exponential moving average, and (5) providing visual feedback of detection state and classified emotion.

The standard approach uses `FaceLandmarker.createFromOptions()` with `baseOptions.modelAssetBuffer` set to the pre-downloaded buffer, `outputFaceBlendshapes: true`, `runningMode: 'VIDEO'`, and `delegate: 'GPU'`. The blendshape output provides 52 continuous scores (0.0-1.0) per frame that map directly to facial muscle activations -- `mouthSmileLeft/Right` for happiness, `browDownLeft/Right` for anger, `jawOpen` + `browInnerUp` for surprise, etc. A rule-based classifier using weighted sums of these scores is sub-millisecond, deterministic, and debuggable. Exponential moving average (EMA) smoothing with an alpha around 0.15-0.25 provides the 1-2 second transition feel required by the success criteria.

**Primary recommendation:** Use `FaceLandmarker.createFromOptions()` with the pre-downloaded model buffer, enable blendshapes, run inference on every frame (Phase 2 only has face detection, no hand model competing for budget), classify emotions from blendshape weighted sums, and smooth all outputs with EMA before exposing to downstream consumers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mediapipe/tasks-vision` | 0.10.32 (pinned) | FaceLandmarker for face detection + blendshape extraction | Already installed, Google-maintained, GPU-accelerated, provides 478 landmarks + 52 blendshapes in one model |
| Custom rule-based classifier | N/A | Map blendshape scores to 5 emotions with intensity | Sub-millisecond, zero bundle weight, deterministic, easily tunable -- no additional ML model needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `three` | 0.182.0 (installed) | Only for coordinate reference if doing any overlay rendering | Already present from Phase 1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rule-based classifier | ONNX Runtime Web with trained model | Adds ~200KB model + loading time; only needed for subtle emotions (contempt, disgust) which are out of scope |
| Blendshape-based rules | Raw landmark geometry ratios | Blendshapes are pre-computed by MediaPipe from landmarks; using raw landmarks means replicating work MediaPipe already does and with lower accuracy |

**Installation:** No new packages needed. All dependencies are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure
```
src/
  ml/
    ModelLoader.ts          # (exists) Downloads model buffers
    FaceDetector.ts         # NEW: FaceLandmarker wrapper, per-frame inference
    EmotionClassifier.ts    # NEW: Blendshape scores -> emotion + intensity
  state/
    EmotionState.ts         # NEW: EMA smoothing, transition management
  core/
    types.ts                # (exists) Add EmotionType, EmotionState, FaceState types
    constants.ts            # (exists) Add emotion thresholds, smoothing params
  ui/
    EmotionOverlay.ts       # NEW: Visual emotion label + detection indicator
```

### Pattern 1: FaceLandmarker Initialization from Pre-Downloaded Buffer

**What:** Create FaceLandmarker using the model buffer already downloaded by ModelLoader in Phase 1.
**When to use:** During the transition from loading to live state in main.ts.
**Key insight:** Use `createFromOptions` (NOT `createFromModelBuffer`) because only `createFromOptions` allows setting `outputFaceBlendshapes: true` at creation time.

```typescript
// Source: @mediapipe/tasks-vision@0.10.32 type definitions (verified from node_modules)
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { WASM_CDN } from '../core/constants.ts';

const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetBuffer: modelLoader.getFaceModelBuffer()!, // Uint8Array from Phase 1
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: false,
});
```

### Pattern 2: Per-Frame Inference with detectForVideo

**What:** Call `detectForVideo()` synchronously each animation frame with the video element and current timestamp.
**When to use:** Inside the render loop, every frame.
**Critical detail:** `detectForVideo` is SYNCHRONOUS and blocks the main thread. It accepts `(videoFrame: ImageSource, timestamp: number)` where timestamp is in milliseconds. Use `performance.now()` for timestamps.

```typescript
// Source: @mediapipe/tasks-vision@0.10.32 type definitions
// detectForVideo signature: (videoFrame: ImageSource, timestamp: number) => FaceLandmarkerResult

function onFrame(video: HTMLVideoElement): void {
  const result = faceLandmarker.detectForVideo(video, performance.now());

  if (result.faceBlendshapes.length > 0) {
    // result.faceBlendshapes[0].categories is Category[]
    // Each Category: { categoryName: string, score: number, index: number, displayName: string }
    const blendshapes = result.faceBlendshapes[0].categories;
    // Process blendshapes...
  }
}
```

### Pattern 3: Blendshape-Based Emotion Classification

**What:** Map weighted sums of specific blendshape scores to emotion categories with intensity.
**When to use:** Every frame after inference returns blendshapes.

The 52 blendshapes map to facial action units. Key blendshapes for each emotion:

| Emotion | Primary Blendshapes | Logic |
|---------|-------------------|-------|
| Happy | `mouthSmileLeft`, `mouthSmileRight`, `cheekSquintLeft`, `cheekSquintRight` | High smile scores + cheek raise |
| Sad | `mouthFrownLeft`, `mouthFrownRight`, `browInnerUp` | Mouth corners down + inner brows up |
| Angry | `browDownLeft`, `browDownRight`, `mouthFrownLeft`, `mouthFrownRight`, `noseSneerLeft`, `noseSneerRight` | Brows down + frown + nose sneer |
| Surprised | `jawOpen`, `browInnerUp`, `browOuterUpLeft`, `browOuterUpRight`, `eyeWideLeft`, `eyeWideRight` | Mouth open + brows up + eyes wide |
| Neutral | Low activation across all emotion-related blendshapes | Default when no emotion scores high enough |

```typescript
// Recommended classifier approach
interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
}

function classifyEmotion(categories: Category[]): EmotionScores {
  // Build lookup map for O(1) access
  const bs = new Map<string, number>();
  for (const cat of categories) {
    bs.set(cat.categoryName, cat.score);
  }
  const get = (name: string) => bs.get(name) ?? 0;

  // Weighted sums for each emotion
  const happy =
    (get('mouthSmileLeft') + get('mouthSmileRight')) / 2 * 0.7 +
    (get('cheekSquintLeft') + get('cheekSquintRight')) / 2 * 0.3;

  const sad =
    (get('mouthFrownLeft') + get('mouthFrownRight')) / 2 * 0.6 +
    get('browInnerUp') * 0.4;

  const angry =
    (get('browDownLeft') + get('browDownRight')) / 2 * 0.5 +
    (get('mouthFrownLeft') + get('mouthFrownRight')) / 2 * 0.25 +
    (get('noseSneerLeft') + get('noseSneerRight')) / 2 * 0.25;

  const surprised =
    get('jawOpen') * 0.35 +
    (get('eyeWideLeft') + get('eyeWideRight')) / 2 * 0.35 +
    (get('browInnerUp') + get('browOuterUpLeft') + get('browOuterUpRight')) / 3 * 0.3;

  // Neutral is the inverse: high when all others are low
  const maxEmotionScore = Math.max(happy, sad, angry, surprised);
  const neutral = Math.max(0, 1 - maxEmotionScore * 1.5);

  return { happy, sad, angry, surprised, neutral };
}
```

### Pattern 4: Exponential Moving Average (EMA) Smoothing

**What:** Smooth raw per-frame emotion scores to prevent jitter and create gradual transitions.
**When to use:** Between raw classification output and the state consumed by the UI/renderer.
**Key parameter:** Alpha (smoothing factor). Lower alpha = smoother but more latent. Higher alpha = more responsive but jittery.

For 1-2 second transitions at 30fps:
- Alpha 0.15 gives roughly 2-second effective transition time (63% of step change in ~6-7 frames at 30fps)
- Alpha 0.25 gives roughly 1-second effective transition time (63% in ~4 frames)
- Recommended: alpha = 0.2 as starting point (tunable)

```typescript
// EMA formula: smoothed = smoothed + alpha * (raw - smoothed)
// Equivalent: smoothed = alpha * raw + (1 - alpha) * smoothed

class EmotionSmoother {
  private smoothed: EmotionScores = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 1 };
  private alpha = 0.2;

  update(raw: EmotionScores): EmotionScores {
    for (const key of Object.keys(this.smoothed) as Array<keyof EmotionScores>) {
      this.smoothed[key] += this.alpha * (raw[key] - this.smoothed[key]);
    }
    return { ...this.smoothed };
  }
}
```

### Pattern 5: Dominant Emotion Extraction with Intensity

**What:** Determine the dominant emotion and its intensity from the smoothed scores.
**When to use:** After smoothing, to produce the final state for UI display and downstream phases.

```typescript
interface EmotionResult {
  dominant: EmotionType;         // The winning emotion
  intensity: number;             // 0-1, how strong the dominant emotion is
  scores: EmotionScores;         // All scores for blending (used by Phase 3 particles)
  faceDetected: boolean;         // Whether a face was found this frame
}

function extractDominant(scores: EmotionScores): { dominant: EmotionType; intensity: number } {
  let dominant: EmotionType = 'neutral';
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion as EmotionType;
    }
  }

  return { dominant, intensity: Math.min(1, maxScore) };
}
```

### Anti-Patterns to Avoid

- **Running detectForVideo without timestamp changes:** If `video.currentTime` has not changed since last call, MediaPipe may return stale results or error. Track `lastVideoTime` and skip inference when the frame is unchanged.
- **Using `createFromModelBuffer` when you need options:** `createFromModelBuffer` does NOT accept an options object. Use `createFromOptions` with `baseOptions.modelAssetBuffer` instead to enable blendshapes.
- **Reading raw blendshapes directly in the renderer:** Raw scores flicker frame-to-frame. Always smooth before consuming. Route all data through the EmotionState smoother.
- **Hardcoding threshold values deep in classification logic:** Put all thresholds and weights in constants.ts so they can be tuned without hunting through code.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face detection | Custom face detection from webcam pixels | MediaPipe FaceLandmarker | 478 landmarks + 52 blendshapes, GPU-accelerated, sub-20ms inference |
| Facial action unit extraction | Custom landmark distance calculations | MediaPipe's `outputFaceBlendshapes: true` | Blendshapes ARE the pre-computed action unit scores; MediaPipe does this internally from landmarks |
| WASM runtime loading | Manual WASM file management | `FilesetResolver.forVisionTasks(WASM_CDN)` | Handles SIMD detection, correct binary selection, and caching |
| Emotion smoothing | Custom averaging buffer with window management | Simple EMA (3 lines of math) | EMA is the standard for this; no library needed but also no need for a complex windowed approach |

**Key insight:** MediaPipe's blendshape output is the highest-value feature for this phase. It transforms what would be a complex geometric analysis problem (computing mouth curvature, brow position, eye openness from 478 raw landmarks) into a simple weighted-sum classification problem on 52 pre-computed scores. Do NOT skip blendshapes and work from raw landmarks.

## Common Pitfalls

### Pitfall 1: Not Enabling Blendshapes
**What goes wrong:** FaceLandmarker is created without `outputFaceBlendshapes: true`, so `result.faceBlendshapes` returns empty arrays. Developer then tries to compute emotions from raw 478 landmarks, which is far more complex and less accurate.
**Why it happens:** Blendshape output is disabled by default. The option name is easy to miss.
**How to avoid:** Always set `outputFaceBlendshapes: true` in createFromOptions. Verify by checking `result.faceBlendshapes.length > 0` after first detection.
**Warning signs:** `result.faceBlendshapes` is an empty array `[]`.

### Pitfall 2: Stale Frame Detection (Same Timestamp)
**What goes wrong:** `detectForVideo` is called with the same video frame (same timestamp) multiple times per animation frame, producing duplicate/stale results or errors.
**Why it happens:** The render loop runs at 60fps but the video may only produce 30 new frames per second. Without checking, you process the same frame twice.
**How to avoid:** Track `lastVideoTime` and only call `detectForVideo` when `video.currentTime !== lastVideoTime`. Always pass `performance.now()` as the timestamp, NOT `video.currentTime`.
**Warning signs:** Console warnings from MediaPipe about timestamps, or identical results on consecutive frames.

### Pitfall 3: Emotion Flickering Without Smoothing
**What goes wrong:** Raw emotion classification changes every frame -- happy, neutral, happy, neutral -- causing visual chaos in any downstream UI or particle system.
**Why it happens:** Blendshape scores are noisy at the boundary between emotions. A slight smile might oscillate between 0.28 and 0.32 around a threshold.
**How to avoid:** Apply EMA smoothing to all emotion scores BEFORE determining dominant emotion. Use alpha = 0.2 as starting point. Never expose raw scores to UI or rendering.
**Warning signs:** Emotion label flickers rapidly. Particle system stutters between states.

### Pitfall 4: No Graceful Fallback When Face Lost
**What goes wrong:** When the user moves out of frame, `result.faceLandmarks` becomes empty. If not handled, the code crashes accessing undefined indices or the UI freezes on the last detected state.
**Why it happens:** Detection is not guaranteed every frame. Users look away, cover faces, or walk away.
**How to avoid:** When no face is detected, gradually decay all emotion scores toward neutral using the same EMA smoother (treat "no face" as `{ happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 1 }`). This produces the "graceful fallback to neutral" required by success criteria.
**Warning signs:** Crash on `result.faceBlendshapes[0]` when array is empty. UI freezes on last state when face leaves frame.

### Pitfall 5: WebGL Context Competition
**What goes wrong:** MediaPipe's GPU delegate creates its own WebGL context internally. Combined with Three.js's WebGL context, the browser may hit the context limit (8-16 depending on browser) on some machines, causing context loss.
**Why it happens:** Each WebGL context consumes GPU resources. Multiple tabs, extensions, and the app's own contexts add up.
**How to avoid:** For Phase 2, this is low risk since Three.js is only rendering an empty scene. But set `delegate: 'GPU'` (not creating an explicit canvas for MediaPipe) and monitor for `webglcontextlost` events on the Three.js canvas. If context loss occurs, the `canvas` option on VisionTaskOptions can be used to share a canvas with MediaPipe.
**Warning signs:** Black flashes on the particle canvas. `webglcontextlost` event fires.

### Pitfall 6: Blendshape Index 0 is "_neutral"
**What goes wrong:** When iterating over blendshape categories, index 0 is `_neutral` (a special baseline category), not one of the 52 named blendshapes. If using array indices to access specific blendshapes, this off-by-one causes wrong mappings.
**Why it happens:** MediaPipe includes `_neutral` as the first element in the categories array (53 total elements, not 52).
**How to avoid:** Always look up blendshapes by `categoryName`, never by array index. Build a Map from `categoryName` to `score`.
**Warning signs:** Emotion detection seems slightly wrong. Scores map to unexpected blendshape names.

## Code Examples

Verified patterns from official sources:

### FaceLandmarker Full Initialization
```typescript
// Source: @mediapipe/tasks-vision@0.10.32 type definitions + official web guide
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult, Category } from '@mediapipe/tasks-vision';

export class FaceDetector {
  private landmarker: FaceLandmarker | null = null;
  private lastVideoTime = -1;

  async init(modelBuffer: Uint8Array, wasmCdnPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmCdnPath);

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: modelBuffer,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  }

  detect(video: HTMLVideoElement): FaceLandmarkerResult | null {
    if (!this.landmarker) return null;
    if (video.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = video.currentTime;
    return this.landmarker.detectForVideo(video, performance.now());
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
```

### Blendshape Access Pattern
```typescript
// Source: @mediapipe/tasks-vision@0.10.32 type definitions
// FaceLandmarkerResult.faceBlendshapes: Classifications[]
// Classifications.categories: Category[]
// Category: { categoryName: string, score: number, index: number, displayName: string }

function getBlendshapeMap(result: FaceLandmarkerResult): Map<string, number> | null {
  if (result.faceBlendshapes.length === 0) return null;

  const map = new Map<string, number>();
  for (const cat of result.faceBlendshapes[0].categories) {
    map.set(cat.categoryName, cat.score);
  }
  return map;
}
```

### EMA Smoother for Emotion Scores
```typescript
// Source: Standard exponential moving average formula
// smoothed_new = alpha * raw + (1 - alpha) * smoothed_old

type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';
type EmotionScores = Record<EmotionType, number>;

class EmotionSmoother {
  private scores: EmotionScores = {
    happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 1,
  };

  constructor(private alpha: number = 0.2) {}

  update(raw: EmotionScores): EmotionScores {
    const keys = Object.keys(this.scores) as EmotionType[];
    for (const key of keys) {
      this.scores[key] += this.alpha * (raw[key] - this.scores[key]);
    }
    return { ...this.scores };
  }

  /** Call when face is lost to decay toward neutral */
  decayToNeutral(): EmotionScores {
    return this.update({ happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 1 });
  }

  /** Get current smoothed state without updating */
  getCurrent(): EmotionScores {
    return { ...this.scores };
  }
}
```

### Render Loop Integration
```typescript
// Integration pattern for main.ts render loop
let lastVideoTime = -1;

function animate(): void {
  stats.begin();

  // Only run inference when a new video frame is available
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = faceDetector.detect(video);

    if (result && result.faceBlendshapes.length > 0) {
      const rawScores = emotionClassifier.classify(result.faceBlendshapes[0].categories);
      emotionState.update(rawScores);
    } else {
      // No face detected: decay to neutral
      emotionState.decayToNeutral();
    }
  }

  // Read smoothed state (always available, even between inference frames)
  const currentEmotion = emotionState.getCurrent();
  emotionOverlay.render(currentEmotion, emotionState.faceDetected);

  sceneManager.render();
  stats.end();
  requestAnimationFrame(animate);
}
```

## Complete List of 52 MediaPipe Blendshapes (ARKit-Compatible)

For reference in the emotion classifier implementation. MediaPipe outputs 52 blendshapes (plus `_neutral` at index 0, for 53 total categories). Values are continuous floats from 0.0 (no activation) to 1.0 (full activation).

**Eye region (14):**
`eyeBlinkLeft`, `eyeLookDownLeft`, `eyeLookInLeft`, `eyeLookOutLeft`, `eyeLookUpLeft`, `eyeSquintLeft`, `eyeWideLeft`, `eyeBlinkRight`, `eyeLookDownRight`, `eyeLookInRight`, `eyeLookOutRight`, `eyeLookUpRight`, `eyeSquintRight`, `eyeWideRight`

**Jaw (4):**
`jawForward`, `jawLeft`, `jawRight`, `jawOpen`

**Mouth (23):**
`mouthClose`, `mouthFunnel`, `mouthPucker`, `mouthLeft`, `mouthRight`, `mouthSmileLeft`, `mouthSmileRight`, `mouthFrownLeft`, `mouthFrownRight`, `mouthDimpleLeft`, `mouthDimpleRight`, `mouthStretchLeft`, `mouthStretchRight`, `mouthRollLower`, `mouthRollUpper`, `mouthShrugLower`, `mouthShrugUpper`, `mouthPressLeft`, `mouthPressRight`, `mouthLowerDownLeft`, `mouthLowerDownRight`, `mouthUpperUpLeft`, `mouthUpperUpRight`

**Brow (5):**
`browDownLeft`, `browDownRight`, `browInnerUp`, `browOuterUpLeft`, `browOuterUpRight`

**Cheek (3):**
`cheekPuff`, `cheekSquintLeft`, `cheekSquintRight`

**Nose (2):**
`noseSneerLeft`, `noseSneerRight`

**Tongue (1):**
`tongueOut`

## Emotion-to-Blendshape Mapping Reference

Recommended weighted combinations for each emotion:

### Happy
| Blendshape | Weight | Rationale |
|-----------|--------|-----------|
| `mouthSmileLeft` | 0.35 | Primary smile indicator |
| `mouthSmileRight` | 0.35 | Primary smile indicator |
| `cheekSquintLeft` | 0.15 | Duchenne smile marker (genuine smile) |
| `cheekSquintRight` | 0.15 | Duchenne smile marker |

### Sad
| Blendshape | Weight | Rationale |
|-----------|--------|-----------|
| `mouthFrownLeft` | 0.30 | Mouth corners down |
| `mouthFrownRight` | 0.30 | Mouth corners down |
| `browInnerUp` | 0.40 | Inner brow raise (sadness marker in FACS) |

### Angry
| Blendshape | Weight | Rationale |
|-----------|--------|-----------|
| `browDownLeft` | 0.25 | Brow lowering |
| `browDownRight` | 0.25 | Brow lowering |
| `mouthFrownLeft` | 0.10 | Mouth tension |
| `mouthFrownRight` | 0.10 | Mouth tension |
| `noseSneerLeft` | 0.15 | Nose wrinkle (anger marker) |
| `noseSneerRight` | 0.15 | Nose wrinkle |

### Surprised
| Blendshape | Weight | Rationale |
|-----------|--------|-----------|
| `jawOpen` | 0.25 | Mouth drops open |
| `eyeWideLeft` | 0.175 | Eyes widen |
| `eyeWideRight` | 0.175 | Eyes widen |
| `browInnerUp` | 0.133 | Brows raise |
| `browOuterUpLeft` | 0.133 | Brows raise |
| `browOuterUpRight` | 0.134 | Brows raise |

### Neutral
Computed as the inverse of the maximum emotion score: `max(0, 1 - maxEmotionScore * 1.5)`. This ensures neutral is dominant only when no emotion scores strongly.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@mediapipe/face_mesh` (separate package) | `@mediapipe/tasks-vision` FaceLandmarker (unified) | 2023 | Single package handles face + hand detection, consistent API |
| Raw landmark geometry for emotion | Blendshape-based classification | MediaPipe added blendshape output in 2023 | Much simpler classifier -- 52 pre-computed action unit scores instead of manual geometry calculations |
| CPU-only WASM inference | GPU delegate via WebGL | Built into tasks-vision | 4-6x speed improvement (10-15fps CPU vs 60fps GPU) |
| face-api.js for emotion detection | MediaPipe blendshapes + custom rules | face-api.js last updated 2020 | Dead library replaced by actively maintained MediaPipe ecosystem |

**Deprecated/outdated:**
- `@mediapipe/face_mesh`: Replaced by FaceLandmarker in `@mediapipe/tasks-vision`. Do not use.
- `face-api.js`: Last updated 2020. Uses older TensorFlow.js models. Do not use.
- Landmark-only emotion classification (without blendshapes): Still works but unnecessarily complex when blendshapes are available.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact blendshape threshold tuning for each emotion**
   - What we know: The weighted-sum approach is correct, and the blendshape names and their semantic meanings are well-documented.
   - What's unclear: Optimal weights and any minimum thresholds (e.g., "only classify as happy if smile score > 0.15") need empirical testing with real webcam data.
   - Recommendation: Start with the weights documented above, test with deliberate expressions, and tune. Put all weights in `constants.ts` for easy adjustment.

2. **Whether `_neutral` blendshape at index 0 has useful data**
   - What we know: MediaPipe includes `_neutral` as category index 0 in the blendshapes array, making the total count 53 rather than 52.
   - What's unclear: Whether the `_neutral` score value is meaningful for classification or should be ignored.
   - Recommendation: Look up blendshapes by `categoryName` (ignoring `_neutral`), never by index. This sidesteps the question entirely.

3. **EMA alpha value for optimal "feel"**
   - What we know: Alpha 0.2 gives roughly 1-1.5 second transitions. Alpha 0.15 gives roughly 2 seconds. These are approximations based on the mathematical properties of EMA.
   - What's unclear: The exact alpha that feels "smooth but responsive" depends on the webcam frame rate and user perception.
   - Recommendation: Start at alpha = 0.2, put it in constants.ts, and adjust based on testing. Consider using a slightly higher alpha (0.3) for the "face lost" -> neutral decay so it responds faster when the user leaves frame.

## Sources

### Primary (HIGH confidence)
- `@mediapipe/tasks-vision@0.10.32` type definitions at `/Users/jimmydore/Projets/computer_vision/node_modules/@mediapipe/tasks-vision/vision.d.ts` -- Verified all type signatures: `FaceLandmarker.createFromOptions()`, `detectForVideo()`, `FaceLandmarkerResult`, `FaceLandmarkerOptions`, `Category`, `Classifications`, `NormalizedLandmark`, `BaseOptions` delegate field, `close()` method
- [Face landmark detection guide for Web (Google AI Edge)](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) -- FaceLandmarker initialization, configuration options, VIDEO mode usage
- [FaceLandmarker class API reference (Google AI Edge)](https://ai.google.dev/edge/api/mediapipe/js/tasks-vision.facelandmarker) -- Static creation methods, option interfaces

### Secondary (MEDIUM confidence)
- [ARKit 52 Blendshapes guide](https://pooyadeperson.com/the-ultimate-guide-to-creating-arkits-52-facial-blendshapes/) -- Complete list of 52 blendshape names (MediaPipe uses ARKit-compatible naming)
- [Apple ARKit BlendShapeLocation documentation](https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation) -- Authoritative blendshape name reference
- [Ready Player Me ARKit morph targets](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/apple-arkit) -- Cross-reference for complete blendshape list
- [Exponential smoothing (Wikipedia)](https://en.wikipedia.org/wiki/Exponential_smoothing) -- EMA formula and alpha parameter behavior

### Tertiary (LOW confidence)
- [Real-Time Face Tracking in the Browser with MediaPipe (Medium)](https://medium.com/@kenzic/real-time-face-tracking-in-the-browser-with-mediapipe-7c818c96b4ca) -- GPU delegate performance claims (10-15fps CPU vs 60fps GPU)
- Emotion-to-blendshape weight values -- Based on FACS (Facial Action Coding System) literature and training knowledge. Weights are reasonable starting points but need empirical validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Package versions verified from package.json, API verified from installed type definitions
- Architecture: HIGH -- FaceLandmarker API shape verified from type definitions, patterns follow official documentation
- Emotion classifier approach: MEDIUM -- Blendshape-to-emotion mapping is well-grounded in FACS literature but exact weights need empirical tuning
- Smoothing approach: HIGH -- EMA is well-understood mathematically; alpha parameter needs runtime tuning
- Pitfalls: HIGH -- Based on verified API behavior (blendshapes off by default, synchronous detection, context limits)

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (stable -- MediaPipe tasks-vision 0.10.x is pinned, Three.js is pinned)
