# Phase 4: Hand Gestures - Research

**Researched:** 2026-02-07
**Domain:** MediaPipe hand tracking, gesture classification, GPU particle force fields
**Confidence:** HIGH

## Summary

Phase 4 adds hand gesture recognition alongside existing face detection to enable interactive particle manipulation. The project already downloads the `hand_landmarker.task` model at startup (in `ModelLoader.ts`) and has the model buffer ready via `getHandModelBuffer()`. The core challenge is: (1) initializing a HandLandmarker, (2) classifying three gestures from 21 hand landmarks, (3) applying force fields to existing particles, and (4) staggering ML inference to maintain 30fps.

Two MediaPipe APIs exist for hand gesture work: `GestureRecognizer` (bundles gesture classification ML) and `HandLandmarker` (landmarks only). **Use `HandLandmarker` + custom rule-based classification** because: GestureRecognizer recognizes "Closed_Fist" and "Open_Palm" but NOT "pinch" -- pinch requires custom logic anyway, and GestureRecognizer needs a different model file (`gesture_recognizer.task`) which the project does NOT currently download. The existing `hand_landmarker.task` is already downloaded and buffered.

Force fields should be applied on the CPU in `ParticlePool.update()`, modifying velocities directly based on hand position. This is consistent with the existing CPU-side particle physics and avoids adding uniforms or shader complexity. The ~100px influence radius translates to approximately 0.15 scene units in the orthographic camera system.

**Primary recommendation:** Use `HandLandmarker` with the already-downloaded model buffer, classify gestures via landmark distance heuristics (finger-curl detection), apply force fields as velocity modifications in `ParticlePool.update()`, and stagger face/hand inference on alternating video frames for performance.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mediapipe/tasks-vision | 0.10.32 | HandLandmarker for 21-point hand tracking | Already installed, same package as FaceLandmarker |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new dependencies) | -- | Gesture classification is rule-based | Custom logic using landmark distances |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HandLandmarker + custom classification | GestureRecognizer | Has Closed_Fist and Open_Palm built-in, but NO pinch gesture; requires different model file (`gesture_recognizer.task`) not currently downloaded; adds ~4MB download for 2/3 gestures we can detect with simple distance math |
| HandLandmarker + custom classification | HolisticLandmarker | Provides face + hand + pose in single call, but adds pose detection overhead, different API callback pattern, different result structure; would require rewriting FaceDetector; single-model coupling makes staggered inference impossible |
| CPU force fields | GPU shader uniforms | GPU would be faster for force calculation, but requires passing hand position + gesture type as uniforms, adds shader complexity, and the existing particle system does all physics on CPU (positions, velocities in Float32Arrays); consistency wins |

**Installation:**
```bash
# No new packages needed -- @mediapipe/tasks-vision already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  ml/
    FaceDetector.ts         # Existing -- face detection
    HandDetector.ts         # NEW -- HandLandmarker wrapper (mirrors FaceDetector pattern)
    EmotionClassifier.ts    # Existing -- emotion from blendshapes
    GestureClassifier.ts    # NEW -- gesture from hand landmarks (rule-based)
  state/
    EmotionState.ts         # Existing -- EMA-smoothed emotion
    GestureState.ts         # NEW -- gesture with stability timer + decay
  particles/
    ParticlePool.ts         # MODIFIED -- add applyForceField() method
    ForceField.ts           # NEW -- force field types and parameters
  ui/
    EmotionOverlay.ts       # Existing -- emotion HUD (top-right)
    GestureOverlay.ts       # NEW -- gesture indicator + aura (bottom-left or top-left)
```

### Pattern 1: HandDetector (mirrors FaceDetector)
**What:** Wrapper around MediaPipe HandLandmarker matching FaceDetector's init/detect/close lifecycle.
**When to use:** Every frame in the render loop (on alternating frames from face detection).
**Example:**
```typescript
// Source: @mediapipe/tasks-vision vision.d.ts, verified from installed package
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export class HandDetector {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async init(modelBuffer: Uint8Array, wasmCdnPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmCdnPath);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: modelBuffer,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,  // User decision: one hand only
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  detect(video: HTMLVideoElement): HandLandmarkerResult | null {
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

### Pattern 2: Rule-Based Gesture Classification from Landmarks
**What:** Classify open-hand, fist, and pinch from 21 hand landmarks using finger-curl heuristics.
**When to use:** After each successful hand detection to determine active gesture.
**Example:**
```typescript
// Source: MediaPipe hand landmark indices (verified from official docs)
// 0=WRIST, 4=THUMB_TIP, 5=INDEX_MCP, 8=INDEX_TIP,
// 9=MIDDLE_MCP, 12=MIDDLE_TIP, 13=RING_MCP, 16=RING_TIP,
// 17=PINKY_MCP, 20=PINKY_TIP

export type GestureType = 'push' | 'attract' | 'pinch' | 'none';

export function classifyGesture(landmarks: NormalizedLandmark[]): GestureType {
  // Finger curl: tip below MCP means finger is curled
  // (MediaPipe y increases downward, but in normalized coords [0,1])
  const indexCurled  = landmarks[8].y > landmarks[6].y;
  const middleCurled = landmarks[12].y > landmarks[10].y;
  const ringCurled   = landmarks[16].y > landmarks[14].y;
  const pinkyCurled  = landmarks[20].y > landmarks[18].y;

  // Pinch: thumb tip close to index tip, other fingers extended or don't care
  const thumbIndexDist = Math.hypot(
    landmarks[4].x - landmarks[8].x,
    landmarks[4].y - landmarks[8].y,
  );
  if (thumbIndexDist < 0.06) return 'pinch';

  // Fist: all four fingers curled
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) return 'attract';

  // Open hand: all four fingers extended
  if (!indexCurled && !middleCurled && !ringCurled && !pinkyCurled) return 'push';

  return 'none';
}
```

### Pattern 3: Staggered Inference (Frame Alternation)
**What:** Run face detection on even video frames, hand detection on odd video frames to halve per-frame ML cost.
**When to use:** In the main render loop to maintain 30fps with two ML models.
**Example:**
```typescript
// In the animate() loop:
let frameCount = 0;

// Only run inference when video frame is new (stale frame returns null from both)
const isNewFrame = video.currentTime !== lastProcessedTime;
if (isNewFrame) {
  lastProcessedTime = video.currentTime;
  if (frameCount % 2 === 0) {
    // Face detection on even frames
    const faceResult = faceDetector.detect(video);
    // ... update emotion state
  } else {
    // Hand detection on odd frames
    const handResult = handDetector.detect(video);
    // ... update gesture state
  }
  frameCount++;
}
```

**Critical note:** The stale-frame check (`video.currentTime === lastVideoTime`) is already built into FaceDetector. The same pattern applies to HandDetector. The staggering must happen at the call site (main.ts), not inside the detectors, because both detectors track their own `lastVideoTime` independently. The call site decides WHICH detector to invoke on each new video frame.

### Pattern 4: CPU Force Fields in ParticlePool
**What:** Apply gesture-driven forces to particle velocities during pool update.
**When to use:** Every frame when a gesture is active, modifying velocities before position integration.
**Example:**
```typescript
// In ParticlePool.update(), after lifetime check but before position integration:
applyForceField(
  handX: number, handY: number,
  gestureType: GestureType,
  radius: number,       // ~0.15 scene units (~100px)
  strength: number,     // gesture-specific
  dt: number,
): void {
  for (let i = 0; i < this.activeCount; i++) {
    const i3 = i * 3;
    const dx = this.positions[i3] - handX;
    const dy = this.positions[i3 + 1] - handY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius || dist < 0.001) continue;

    const t = 1.0 - dist / radius; // 1 at center, 0 at edge (linear falloff)
    const force = strength * t * t; // Quadratic falloff for natural feel

    switch (gestureType) {
      case 'push': {
        // Radial outward explosion
        const nx = dx / dist;
        const ny = dy / dist;
        this.velocities[i3]     += nx * force * dt;
        this.velocities[i3 + 1] += ny * force * dt;
        break;
      }
      case 'attract': {
        // Spiral inward (tangential + radial inward)
        const nx = dx / dist;
        const ny = dy / dist;
        // Inward component
        this.velocities[i3]     -= nx * force * 0.6 * dt;
        this.velocities[i3 + 1] -= ny * force * 0.6 * dt;
        // Tangential component (perpendicular, creates spiral)
        this.velocities[i3]     += (-ny) * force * 0.4 * dt;
        this.velocities[i3 + 1] += nx * force * 0.4 * dt;
        break;
      }
      case 'pinch': {
        // Vortex funnel: strong tangential + strong inward convergence
        const nx = dx / dist;
        const ny = dy / dist;
        // Strong inward pull
        this.velocities[i3]     -= nx * force * 0.7 * dt;
        this.velocities[i3 + 1] -= ny * force * 0.7 * dt;
        // Fast rotation
        this.velocities[i3]     += (-ny) * force * 0.8 * dt;
        this.velocities[i3 + 1] += nx * force * 0.8 * dt;
        break;
      }
    }
  }
}
```

### Pattern 5: Gesture State with Stability Timer
**What:** Debounce gesture changes with ~150ms stability requirement (GES-06).
**When to use:** Between raw classification and force field activation to prevent flicker.
**Example:**
```typescript
export class GestureState {
  private currentGesture: GestureType = 'none';
  private pendingGesture: GestureType = 'none';
  private pendingTimer = 0;
  private readonly STABILITY_MS = 150;

  // Force field decay when hand leaves
  private handPresent = false;
  private decayTimer = 0;
  private readonly DECAY_MS = 300;
  private lastHandPosition: { x: number; y: number } | null = null;

  update(rawGesture: GestureType, handDetected: boolean, dt: number): {
    gesture: GestureType;
    active: boolean;
    strength: number; // 0-1 for decay
  } {
    if (handDetected) {
      this.handPresent = true;
      this.decayTimer = 0;

      if (rawGesture !== this.pendingGesture) {
        this.pendingGesture = rawGesture;
        this.pendingTimer = 0;
      } else {
        this.pendingTimer += dt * 1000;
        if (this.pendingTimer >= this.STABILITY_MS) {
          this.currentGesture = this.pendingGesture;
        }
      }
      return { gesture: this.currentGesture, active: this.currentGesture !== 'none', strength: 1 };
    } else {
      // Hand lost -- decay
      if (this.handPresent) {
        this.handPresent = false;
        this.decayTimer = 0;
      }
      this.decayTimer += dt * 1000;
      const decayProgress = Math.min(1, this.decayTimer / this.DECAY_MS);
      const strength = 1 - decayProgress;
      if (decayProgress >= 1) {
        this.currentGesture = 'none';
        this.pendingGesture = 'none';
      }
      return { gesture: this.currentGesture, active: strength > 0, strength };
    }
  }
}
```

### Anti-Patterns to Avoid
- **Running both models on every frame:** Will drop to ~15fps. Stagger face/hand on alternating video frames.
- **Using GestureRecognizer for pinch:** No built-in pinch gesture; would need custom model training with ModelMaker for zero benefit over simple distance check.
- **GPU-side force fields:** The existing particle system does all physics on CPU (ParticlePool.update). Adding force field uniforms to the shader creates a split physics model that's harder to reason about and debug.
- **Multiple FilesetResolver calls:** `FilesetResolver.forVisionTasks()` downloads WASM files. Call it once, pass the same `WasmFileset` to both FaceLandmarker and HandLandmarker. However: the existing FaceDetector.init() calls FilesetResolver internally. Either refactor to share, or accept the double call (WASM is cached by browser on second load -- minimal overhead).
- **Using HolisticLandmarker:** Would require rewriting FaceDetector and changing the emotion pipeline. Pose detection overhead is unnecessary. Staggered inference becomes impossible since it's a single combined model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hand landmark detection | Custom CV hand detection | MediaPipe HandLandmarker | 21-point tracking trained on 30K+ images, works in-browser |
| Gesture stabilization | Ad-hoc debounce with setTimeout | Proper state machine with timer accumulation | setTimeout drifts, timer accumulation integrates with the render loop's dt |
| Palm center calculation | Average all 21 landmarks | Average of WRIST (0) and MIDDLE_FINGER_MCP (9) | This pair is what MediaPipe itself uses for hand ROI; robust proxy for palm center |
| Coordinate transform (MediaPipe to scene) | New conversion code | Reuse FaceLandmarkTracker.toScene() pattern | Same ortho camera, same mirror logic -- extract as utility |

**Key insight:** The gesture classification for open/fist/pinch is simple enough to be rule-based (finger-curl detection via landmark y-coordinates + thumb-index distance). This matches the project's existing pattern: emotion classification is also rule-based (weighted blendshapes), not a separate ML model.

## Common Pitfalls

### Pitfall 1: Stale Frame Double-Detection
**What goes wrong:** Both FaceDetector and HandDetector detect on the same video frame, wasting one inference cycle.
**Why it happens:** At 60fps render, 30fps video, each video frame is "new" for only one render frame. If both detectors independently check `video.currentTime`, they both see the same "new" frame.
**How to avoid:** Stagger at the call site: on each new video frame, call ONLY face OR hand detector (alternating). Each detector's internal `lastVideoTime` handles its own staleness.
**Warning signs:** Both detectors returning non-null results on the same render frame.

### Pitfall 2: Gesture Flicker During Transitions
**What goes wrong:** User transitions from open hand to fist; intermediate frames may briefly classify as "none" or wrong gesture.
**Why it happens:** During finger curl transition, landmarks are in ambiguous positions.
**How to avoid:** 150ms stability timer (GES-06). Don't switch gesture until new gesture persists for 150ms.
**Warning signs:** Rapidly flickering gesture indicator, particles jerking between behaviors.

### Pitfall 3: MediaPipe Coordinate System Mismatch
**What goes wrong:** Hand position appears at wrong location on screen.
**Why it happens:** MediaPipe landmarks: x=[0,1] left-to-right, y=[0,1] top-to-bottom. Scene (ortho): x=[-aspect, aspect], y=[-1, 1]. Webcam is mirrored.
**How to avoid:** Use exact same conversion as FaceLandmarkTracker.toScene(): `x = -(lm.x * 2 - 1) * aspect`, `y = -(lm.y * 2 - 1)`.
**Warning signs:** Hand aura appears in opposite corner or wrong position.

### Pitfall 4: Force Field Strength Independent of Frame Rate
**What goes wrong:** Force feels different at 30fps vs 60fps.
**Why it happens:** Applying a fixed velocity change per frame instead of per second.
**How to avoid:** Multiply all force applications by `dt` (delta time in seconds). The code example above already does this.
**Warning signs:** Particles move faster/slower when FPS changes.

### Pitfall 5: Emotion Override When Gesture Active
**What goes wrong:** Particles fight between emotion-driven forces and gesture forces.
**Why it happens:** Both emotion profile's direction/speed AND gesture force field apply simultaneously.
**How to avoid:** User decision: gesture forces override emotion forces completely while active. When gesture is active, skip emotion-driven velocity components but KEEP emotion-driven spawning (spawn stays on face) and colors.
**Warning signs:** Particles vibrating or behaving erratically during gesture.

### Pitfall 6: Hand Covering Face (Occlusion)
**What goes wrong:** Face detection fails when hand passes in front of face, emotion decays to neutral.
**Why it happens:** MediaPipe face detection loses the face when occluded.
**How to avoid:** User decision: freeze last emotion state when hand detected AND face lost. Resume face detection when face becomes visible again. Track `lastValidEmotion` separately from live detection.
**Warning signs:** Emotion overlay flickering to "neutral" whenever hand is near face.

### Pitfall 7: Finger Curl Direction Ambiguity
**What goes wrong:** Gesture misclassified when hand is rotated/tilted.
**Why it happens:** Simple y-coordinate comparison (`tip.y > mcp.y`) assumes hand is roughly upright. If hand is sideways, the comparison breaks.
**How to avoid:** Use TIP-to-MCP distance relative to the hand's own coordinate frame, OR compare TIP-to-WRIST distance vs PIP-to-WRIST distance. The simpler y-comparison works well for typical webcam use (hand faces camera, roughly upright) but may need adjustment. Start with y-comparison, tune if needed.
**Warning signs:** Gesture misdetection when hand is tilted significantly.

## Code Examples

### Hand Landmark Indices Reference
```typescript
// Source: MediaPipe official documentation, verified via WebSearch
// https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
export const HandLandmark = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;
```

### Palm Center Calculation
```typescript
// Palm center: midpoint of WRIST and MIDDLE_FINGER_MCP
// This is the same reference pair MediaPipe uses internally for hand ROI
function getPalmCenter(landmarks: NormalizedLandmark[]): { x: number; y: number } {
  const wrist = landmarks[HandLandmark.WRIST];
  const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];
  return {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
  };
}
```

### Influence Radius Conversion (Pixels to Scene Units)
```typescript
// User decision: ~100px influence radius
// Scene uses orthographic camera: x=[-aspect, aspect], y=[-1, 1]
// Viewport height maps to 2.0 scene units
// 100px / viewportHeight * 2.0 = scene units
// At 480p: 100/480 * 2.0 = ~0.42 scene units
// At 1080p: 100/1080 * 2.0 = ~0.19 scene units
// Use dynamic calculation based on window height:
const influenceRadius = (100 / window.innerHeight) * 2.0;
```

### Gesture Overlay UI Pattern
```typescript
// Mirrors EmotionOverlay pattern: fixed position, pointer-events: none,
// backdrop-filter blur, minimal DOM writes
export class GestureOverlay {
  private root: HTMLDivElement;
  private label: HTMLSpanElement;
  private prevGesture: GestureType | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'gesture-overlay';  // CSS: position fixed, bottom-left or top-left

    this.label = document.createElement('span');
    this.label.className = 'gesture-overlay__label';
    this.label.textContent = '--';

    this.root.appendChild(this.label);
    container.appendChild(this.root);
  }

  update(gesture: GestureType): void {
    if (gesture === this.prevGesture) return; // Skip redundant DOM writes
    const labels: Record<GestureType, string> = {
      push: 'push',
      attract: 'attract',
      pinch: 'concentrate',
      none: '--',
    };
    this.label.textContent = labels[gesture];
    this.prevGesture = gesture;
  }
}
```

### Hand Aura (Canvas 2D Overlay)
```typescript
// Subtle radial gradient at hand position showing force field radius
// Option A: CSS radial-gradient on a positioned div (simplest, good enough)
// Option B: Separate Canvas2D overlay (more control, but extra element)
// Recommendation: CSS approach -- consistent with existing DOM overlays
//
// The aura div is positioned absolutely over the video, coordinates
// converted from scene space back to screen space for DOM positioning:
//   screenX = (1 - (sceneX / aspect + 1) / 2) * viewportWidth  (mirror)
//   screenY = (1 - (sceneY + 1) / 2) * viewportHeight
//
// Radial gradient: transparent center fading to gesture-appropriate color
// Opacity: ~0.15-0.25 for subtlety (Claude's discretion)
```

### Main Loop Integration Sketch
```typescript
// Staggered inference in animate():
let inferenceToggle = false; // alternates face/hand

// On new video frame:
if (isNewVideoFrame) {
  if (inferenceToggle) {
    const handResult = handDetector.detect(video);
    if (handResult && handResult.landmarks.length > 0) {
      const landmarks = handResult.landmarks[0];
      const rawGesture = classifyGesture(landmarks);
      const palmCenter = getPalmCenter(landmarks);
      const handScenePos = toScene(palmCenter, aspect); // reuse face conversion
      gestureState.updateHandPosition(handScenePos);
      gestureState.updateGesture(rawGesture);
    } else {
      gestureState.markHandLost();
    }
  } else {
    const faceResult = faceDetector.detect(video);
    // ... existing emotion pipeline
    // If face not detected BUT hand is present: freeze emotion (occlusion handling)
  }
  inferenceToggle = !inferenceToggle;
}

// Every frame (whether inference ran or not):
const { gesture, active, strength } = gestureState.getCurrent(dt);
if (active) {
  const handPos = gestureState.getHandPosition();
  particlePool.applyForceField(handPos.x, handPos.y, gesture, influenceRadius, strength, dt);
  // Skip emotion-driven velocity application (gesture override)
}
// Always spawn from face (regardless of gesture) and apply emotion colors
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MediaPipe Hands (legacy) | HandLandmarker (@mediapipe/tasks-vision) | 2023 (tasks-vision release) | New API, model bundle format, GPU delegate support |
| Separate hand detection + tracking | Single HandLandmarker with built-in tracking | 2023 | Internal palm detection + landmark tracking; re-triggers detection only when hand lost |
| Custom WebGL gesture detection | MediaPipe WASM + GPU delegate | 2023+ | 12-17ms latency on mobile GPU, optimized for browser |

**Deprecated/outdated:**
- `@mediapipe/hands` (legacy package): Replaced by `@mediapipe/tasks-vision` HandLandmarker. Do NOT use the old package.
- `LIVE_STREAM` running mode: Exists but uses callbacks instead of synchronous returns; `VIDEO` mode with `detectForVideo()` is simpler and matches the existing FaceDetector pattern.

## Open Questions

1. **FilesetResolver sharing between FaceLandmarker and HandLandmarker**
   - What we know: Both use `FilesetResolver.forVisionTasks()` which returns a `WasmFileset`. FaceLandmarker.init() currently creates its own FilesetResolver. HandLandmarker.init() will need one too.
   - What's unclear: Whether calling `FilesetResolver.forVisionTasks()` twice downloads WASM files twice, or whether the browser caches them. The WASM files are loaded from CDN so HTTP caching likely handles this.
   - Recommendation: Accept two calls for now (simplicity). The WASM CDN URL is identical, browser cache will serve the second call instantly. Refactoring to share a single FilesetResolver is possible but adds coupling between FaceDetector and HandDetector. Not worth the complexity.

2. **Hand orientation robustness**
   - What we know: Simple y-coordinate finger-curl detection works well for upright hands facing the webcam. This is the most common hand orientation in our use case.
   - What's unclear: How well it handles significantly rotated hands (e.g., hand held sideways).
   - Recommendation: Start with y-coordinate comparison. If user testing reveals issues, upgrade to wrist-relative distance comparison. Document this as a known limitation.

3. **Force field strength tuning**
   - What we know: User wants "explosive" push, "steady pull" attract, "sharp concentration" pinch.
   - What's unclear: Exact force multipliers that feel right at current particle speeds (0.2-1.8 scene units/sec).
   - Recommendation: Define base strengths as constants in `constants.ts` (tunable), start with push=8.0, attract=4.0, pinch=6.0 and iterate. These are scene-units/sec^2 acceleration values.

4. **Aura rendering approach**
   - What we know: User wants a subtle glow around hand position showing force field radius.
   - What's unclear: Whether CSS radial-gradient div or Canvas 2D overlay performs better and looks cleaner.
   - Recommendation: Use a CSS div with `background: radial-gradient(circle, rgba(color, 0.2) 0%, transparent 70%)` positioned at the hand location. Width/height set to 2x the influence radius. This is the simplest approach consistent with existing DOM overlays (EmotionOverlay, QualityScaler indicator). Fall back to Canvas2D only if CSS approach has visible artifacts.

## Sources

### Primary (HIGH confidence)
- `@mediapipe/tasks-vision@0.10.32` vision.d.ts -- HandLandmarker, GestureRecognizer, HandLandmarkerResult, GestureRecognizerOptions type definitions (read directly from installed package)
- MediaPipe Hand Landmarker guide: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker -- model architecture, performance benchmarks (17ms CPU, 12ms GPU on Pixel 6), two-stage pipeline
- MediaPipe GestureRecognizer guide: https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer -- built-in gestures list (Closed_Fist, Open_Palm, etc., NO pinch)
- Existing codebase: FaceDetector.ts, ParticlePool.ts, FaceLandmarkTracker.ts, ModelLoader.ts, main.ts -- patterns to mirror

### Secondary (MEDIUM confidence)
- MediaPipe hand landmark indices (0-20): https://mediapipe.readthedocs.io/en/latest/solutions/hands.html -- WRIST through PINKY_TIP mapping, cross-verified with multiple sources
- Gesture classification via landmark distance: https://gist.github.com/TheJLifeX/74958cc59db477a91837244ff598ef4a -- finger curl via y-coordinate comparison, pinch via thumb-index distance <0.05-0.1 threshold
- Palm center from WRIST(0) + MIDDLE_FINGER_MCP(9): consistent with MediaPipe's own ROI calculation

### Tertiary (LOW confidence)
- Multiple FilesetResolver calls being cached: Based on understanding of HTTP caching behavior with CDN assets; not explicitly verified in MediaPipe documentation
- Force field strength values (push=8, attract=4, pinch=6): Initial estimates based on existing particle speeds; will need live tuning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- HandLandmarker is in the already-installed package, model already downloaded
- Architecture: HIGH -- mirrors existing FaceDetector pattern, codebase patterns well understood
- Gesture classification: HIGH -- landmark indices and finger-curl heuristics well documented across multiple sources
- Force fields: MEDIUM -- physics approach is sound but exact parameters need tuning
- Pitfalls: HIGH -- staggered inference, coordinate mismatch, and gesture flicker are well-known patterns

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- MediaPipe tasks-vision 0.10.x is mature)
