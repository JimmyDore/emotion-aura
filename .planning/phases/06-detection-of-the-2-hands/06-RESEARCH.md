# Phase 6: Detection of the 2 Hands - Research

**Researched:** 2026-02-07
**Domain:** MediaPipe multi-hand detection, dual gesture state management, multi-source force fields
**Confidence:** HIGH

## Summary

This phase upgrades the existing single-hand detection pipeline to support two simultaneous hands, each with independent gesture recognition and force field application. The change is architecturally straightforward because MediaPipe's HandLandmarker natively supports `numHands: 2` -- the existing model and WASM runtime require zero changes. The core work is in the state management layer: the current single `GestureState` instance must become two (one per hand), the `GestureOverlay` and hand aura visuals must render per-hand, and `ParticlePool.applyForceField()` must be called once per active hand per frame.

The biggest technical risk is performance. Changing `numHands` from 1 to 2 increases the landmark detection step (palm detection runs once, but landmark inference runs per detected hand). The existing staggered inference pattern (face on even frames, hand on odd) already limits hand detection to ~15fps. With two hands the landmark step roughly doubles, but since landmark inference on GPU takes ~12ms total for the full pipeline (Google's benchmark for full model), two hands should remain within the ~33ms per-frame budget on GPU-capable browsers. The QualityScaler provides a safety net.

**Primary recommendation:** Change `numHands` to 2, iterate over `result.landmarks` array with paired `result.handedness`, maintain two `GestureState` instances keyed by handedness label ("Left"/"Right"), and call `applyForceField()` once per active hand. No new libraries needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mediapipe/tasks-vision | ^0.10.32 | Hand landmark detection (already installed) | Same library, same model, just `numHands: 2` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | -- | -- | All existing dependencies sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| numHands: 2 on existing HandLandmarker | MediaPipe GestureRecognizer task | GestureRecognizer bundles built-in gesture classification, but we already have a custom classifier tuned to our push/attract needs. Adding GestureRecognizer would be redundant and add download weight. |
| Two HandLandmarker instances (one per hand) | Single instance with numHands: 2 | Two instances would double WASM memory and GPU context usage for no benefit. MediaPipe handles multi-hand internally. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Current Single-Hand Architecture
```
src/
├── ml/
│   ├── HandDetector.ts          # numHands: 1, returns HandLandmarkerResult
│   └── GestureClassifier.ts     # classifyGesture(landmarks) -> GestureType
├── state/
│   └── GestureState.ts          # Single instance, stability + decay
├── ui/
│   └── GestureOverlay.ts        # Single gesture label at top-left
├── particles/
│   └── ParticlePool.ts          # applyForceField() called once per frame
└── main.ts                      # Wires single hand pipeline
```

### Recommended Dual-Hand Architecture
```
src/
├── ml/
│   ├── HandDetector.ts          # CHANGE: numHands: 2
│   └── GestureClassifier.ts     # NO CHANGE (pure function, called per hand)
├── state/
│   └── GestureState.ts          # NO CHANGE to class; main.ts creates TWO instances
├── ui/
│   └── GestureOverlay.ts        # CHANGE: show per-hand gesture labels (L/R)
├── particles/
│   └── ParticlePool.ts          # NO CHANGE (applyForceField called twice)
├── core/
│   └── types.ts                 # ADD: HandId type, multi-hand result types
└── main.ts                      # CHANGE: iterate hands array, route to correct GestureState
```

### Pattern 1: Per-Hand State Keyed by Handedness Label
**What:** Create a `Map<string, GestureState>` keyed by "Left" or "Right" handedness labels from MediaPipe. Each hand gets its own independent stability timer, decay, and position tracking.
**When to use:** Always -- this is the core pattern for this phase.
**Example:**
```typescript
// Source: MediaPipe HandLandmarkerResult API
// result.handedness[i][0].categoryName is "Left" or "Right"
// result.landmarks[i] is the 21-landmark array for that hand

const gestureStates = new Map<string, GestureState>([
  ['Left', new GestureState()],
  ['Right', new GestureState()],
]);

// In the hand frame of the render loop:
const handResult = handDetector.detect(video);
if (handResult && handResult.landmarks.length > 0) {
  // Track which hands were seen this frame
  const seenHands = new Set<string>();

  for (let i = 0; i < handResult.landmarks.length; i++) {
    const landmarks = handResult.landmarks[i];
    const handedness = handResult.handedness[i][0].categoryName; // "Left" or "Right"
    seenHands.add(handedness);

    const rawGesture = classifyGesture(landmarks);
    const palmCenter = getPalmCenter(landmarks);
    const palmSceneX = -(palmCenter.x * 2 - 1) * aspect;
    const palmSceneY = -(palmCenter.y * 2 - 1);

    const state = gestureStates.get(handedness)!;
    state.update(rawGesture, true, { x: palmSceneX, y: palmSceneY }, handDt);
  }

  // Hands NOT seen this frame: update with no detection
  for (const [label, state] of gestureStates) {
    if (!seenHands.has(label)) {
      state.update('none', false, null, handDt);
    }
  }
}
```

### Pattern 2: Multiple Force Field Application
**What:** After updating all gesture states, iterate both and apply force fields independently. Two concurrent push gestures create a compound explosion; push + attract creates a tug-of-war.
**When to use:** Every frame during the force field section of the render loop.
**Example:**
```typescript
// Apply force fields from ALL active hands
for (const [_label, state] of gestureStates) {
  const result = state.getCurrent();
  if (result.active && result.handPosition) {
    const strength = forceStrengths[result.gesture] * result.strength;
    const influenceRadius = (GESTURE_INFLUENCE_PX / window.innerHeight) * 2.0;
    particleSystem.getPool().applyForceField(
      result.handPosition.x,
      result.handPosition.y,
      result.gesture,
      influenceRadius,
      strength,
      dt,
    );
  }
}
```

### Pattern 3: Per-Hand UI Elements (Overlay + Aura)
**What:** Two hand aura DOM elements (one per hand) and a gesture overlay that shows both hand states.
**When to use:** Visual feedback for dual-hand interaction.
**Example:**
```typescript
// GestureOverlay updated to show L/R labels
// Option A: Two separate labels "L: Push  R: Attract"
// Option B: Two-line display

// Hand auras: two DOM elements, each positioned independently
const handAuras = new Map<string, HTMLDivElement>([
  ['Left', createHandAura()],
  ['Right', createHandAura()],
]);

// Position each aura based on its hand's gesture state
for (const [label, aura] of handAuras) {
  const result = gestureStates.get(label)!.getCurrent();
  if (result.active && result.handPosition) {
    positionAura(aura, result.handPosition, aspect);
    aura.classList.add('hand-aura--visible');
  } else {
    aura.classList.remove('hand-aura--visible');
  }
}
```

### Anti-Patterns to Avoid
- **Single GestureState with two positions:** Don't try to cram both hands into one state object. Each hand has independent stability timing, decay, and gesture type. Use two instances.
- **Assuming hand order is stable:** MediaPipe's `landmarks` array order can change between frames (hand at index 0 this frame might be index 1 next frame). Always use `handedness` label to route to the correct state.
- **Detecting same hand twice:** When `numHands: 2`, MediaPipe may occasionally detect the same physical hand twice (e.g., both entries say "Right"). Guard against this by using a Set and ignoring duplicates.
- **Creating two HandLandmarker instances:** One instance with `numHands: 2` is correct. Two instances would waste memory and compete for GPU.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-hand detection | Custom palm detection or hand splitting | MediaPipe `numHands: 2` | Palm detection + tracking + handedness built into the model |
| Hand identity tracking across frames | Frame-to-frame hand matching by position | MediaPipe `handedness` label | MediaPipe's internal tracker handles identity; handedness label is the stable key |
| Force field combination | Custom "merge" logic for overlapping force fields | Call `applyForceField()` per hand | Physics forces are additive -- two calls naturally compose (two pushes = bigger push, push + attract = tug-of-war) |

**Key insight:** Forces in the particle system are velocity modifications -- they are naturally additive. Two `applyForceField()` calls per frame produce physically correct combined behavior without any special combination logic.

## Common Pitfalls

### Pitfall 1: Handedness Mirroring Confusion
**What goes wrong:** MediaPipe assumes the input image is mirrored (front-facing selfie camera). Since the webcam feed is mirrored with `scaleX(-1)` in this app, the raw video going to MediaPipe is NOT mirrored. This means "Left" from MediaPipe actually refers to the user's right hand, and vice versa.
**Why it happens:** The webcam stream fed to `detectForVideo()` is the raw un-mirrored stream. The CSS `transform: scaleX(-1)` only affects visual display, not the pixels MediaPipe sees.
**How to avoid:** Either swap the labels when displaying them to the user (so "Left" from MediaPipe shows as "R" on screen), or keep the internal labels as-is and only translate at the UI layer. The force field positions are already correctly mirrored by the `-(palmCenter.x * 2 - 1) * aspect` transform in the current code (the leading negative sign mirrors x).
**Warning signs:** User's right hand labeled "Left" on screen, or auras appearing on the wrong side.

### Pitfall 2: Stale Gesture State When Hand Count Changes
**What goes wrong:** User shows two hands, then removes one. The removed hand's GestureState must decay properly, not freeze with active gesture.
**Why it happens:** The "not seen this frame" update path is missed when only iterating the detected hands.
**How to avoid:** After iterating detected hands, explicitly update all non-seen hands with `(none, false, null, dt)`. The existing `GestureState.update()` decay logic handles this correctly as long as it receives the "hand not detected" signal.
**Warning signs:** Ghost force field persisting after hand is removed from frame.

### Pitfall 3: Performance Regression with numHands: 2
**What goes wrong:** FPS drops below 30 because landmark inference now runs twice per hand frame.
**Why it happens:** Each detected hand requires a separate landmark model pass. With the staggered inference already limiting hand detection to ~15Hz, doubling the landmark work could push individual hand frames over budget.
**How to avoid:**
1. Keep GPU delegate enabled (Chrome) -- GPU inference is ~3x faster than CPU.
2. The existing QualityScaler will auto-reduce particle count if FPS drops.
3. Monitor with stats.js during testing.
4. If needed, consider reducing `minHandDetectionConfidence` slightly to prevent expensive re-detection cycles (tracking is cheaper than detection).
**Warning signs:** stats.js showing periodic frame spikes on hand-inference frames (odd frames).

### Pitfall 4: Both Hands Detected as Same Handedness
**What goes wrong:** MediaPipe occasionally classifies both detected hands as "Right" (or both as "Left"), causing one hand's state to be overwritten.
**Why it happens:** Handedness classification has ~95% accuracy per hand. With two hands, ~10% of frames may have at least one misclassification.
**How to avoid:** When processing results, if both hands report the same handedness, use the one with higher confidence and update the other state as "not detected" for that frame. Alternatively, use position-based disambiguation (leftmost x = Left, rightmost x = Right) as a fallback.
**Warning signs:** One hand's aura flickering or jumping to the other hand's position.

### Pitfall 5: Overlapping Force Fields Creating Extreme Velocities
**What goes wrong:** When both hands are close together with push gestures, particles between them receive double force and shoot off-screen at extreme velocities.
**Why it happens:** Two `applyForceField()` calls with overlapping radii are purely additive.
**How to avoid:** The existing velocity damping (`*= 0.995` per frame) and the dt-capped movement already limit this. If extreme velocities occur, add a velocity magnitude cap (e.g., 5.0 scene units/sec) in `ParticlePool.update()`. This is a tuning issue, not an architectural one.
**Warning signs:** Particles suddenly disappearing (flying off-screen instantly).

## Code Examples

### Example 1: Changing numHands in HandDetector
```typescript
// Source: Existing HandDetector.ts, line 37
// BEFORE:
numHands: 1,
// AFTER:
numHands: 2,
```
This is the only change needed in HandDetector.ts. The `detect()` method already returns the full `HandLandmarkerResult` which naturally contains 0, 1, or 2 hand entries.

### Example 2: Accessing Handedness from Result
```typescript
// Source: MediaPipe HandLandmarkerResult API
// https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js

const result = handDetector.detect(video);
if (result && result.landmarks.length > 0) {
  for (let i = 0; i < result.landmarks.length; i++) {
    // Handedness: result.handedness[i] is Category[] (array of one element)
    const handedness = result.handedness[i][0].categoryName; // "Left" or "Right"
    const confidence = result.handedness[i][0].score;        // 0.5-1.0
    const landmarks = result.landmarks[i];                   // NormalizedLandmark[21]

    console.log(`Hand ${i}: ${handedness} (${confidence.toFixed(2)})`);
  }
}
```

### Example 3: Dual GestureOverlay Display
```typescript
// Two-line gesture display: "L: Push / R: Attract"
// Reuse existing glassmorphic styling
update(leftGesture: GestureType, rightGesture: GestureType): void {
  // Note: MediaPipe "Left" = user's right hand (mirrored camera)
  // Display as R/L from user perspective
  const rLabel = GESTURE_LABELS[leftGesture];   // MediaPipe Left = user's Right
  const lLabel = GESTURE_LABELS[rightGesture];  // MediaPipe Right = user's Left

  const text = `L: ${lLabel} / R: ${rLabel}`;
  if (text !== this.prevText) {
    this.label.textContent = text;
    this.prevText = text;
  }
}
```

### Example 4: Velocity Cap Safety (if needed)
```typescript
// In ParticlePool.update(), after applying all forces:
const vx = this.velocities[i3];
const vy = this.velocities[i3 + 1];
const speed = Math.sqrt(vx * vx + vy * vy);
const MAX_SPEED = 5.0; // scene units per second
if (speed > MAX_SPEED) {
  const scale = MAX_SPEED / speed;
  this.velocities[i3] *= scale;
  this.velocities[i3 + 1] *= scale;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| numHands: 1 (Phase 4 decision) | numHands: 2 (Phase 6 upgrade) | Phase 6 | Enables two-hand detection with no model/WASM changes |
| Single GestureState | Two GestureState instances keyed by handedness | Phase 6 | Independent gesture tracking per hand |
| Single hand aura | Two hand auras (one per hand) | Phase 6 | Visual clarity for dual-hand interaction |
| Single applyForceField() call | Two calls (one per active hand) | Phase 6 | Combined force effects on particle system |

**Deprecated/outdated:**
- The `numHands: 1` decision from Phase 4 [04-01] was correct for that phase (performance over multi-hand when only single hand was needed). It is now intentionally overridden.

## Open Questions

1. **Performance with numHands: 2 on lower-end hardware**
   - What we know: MediaPipe GPU benchmark shows ~12ms for the full pipeline. Two-hand landmark inference roughly doubles the landmark step but palm detection runs once.
   - What's unclear: Real-world performance on integrated GPUs (Intel, Apple M-series) with face + hand staggered inference. No published benchmarks for this specific scenario.
   - Recommendation: Test empirically. QualityScaler provides automatic fallback. If needed, add a user-facing toggle to switch between 1-hand and 2-hand mode.

2. **Handedness misclassification rate with two hands**
   - What we know: Handedness accuracy is ~95% per hand. With two hands, at least one misclassification expected ~10% of frames.
   - What's unclear: Whether position-based fallback (leftmost x = Left) introduces its own jitter when hands cross over.
   - Recommendation: Start with handedness-only keying. If testing reveals frequent misclassification, add position-based tiebreaking for same-handedness conflicts only.

3. **Visual distinctness of dual-hand effects**
   - What we know: Two force fields applied to the same particles naturally create combined effects (push-push = compound explosion, push-attract = tug-of-war, attract-attract = two orbits).
   - What's unclear: Whether the visual result is "distinct" enough to satisfy success criterion 3 without additional visual differentiation (e.g., different aura colors per hand).
   - Recommendation: Start with identical aura styling for both hands. If combined effects look indistinct, consider adding subtle color differentiation to the auras (e.g., slight blue tint for left, slight orange for right).

## Sources

### Primary (HIGH confidence)
- [MediaPipe Hand Landmarker Web JS Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) -- numHands config, HandLandmarkerResult structure, handedness API
- [MediaPipe Hand Landmarker Overview](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) -- Pipeline architecture, palm detection vs tracking optimization, benchmark data (17.12ms CPU, 12.27ms GPU)
- [MediaPipe Hands Legacy Documentation](https://github.com/google/mediapipe/blob/master/docs/solutions/hands.md) -- Handedness mirroring behavior, palm detection anchor optimization, multi-hand tracking strategy
- Existing codebase: `src/ml/HandDetector.ts`, `src/state/GestureState.ts`, `src/ml/GestureClassifier.ts`, `src/particles/ParticlePool.ts`, `src/main.ts` -- Current single-hand architecture

### Secondary (MEDIUM confidence)
- [MediaPipe Hands Paper (arXiv:2006.10214)](https://arxiv.org/abs/2006.10214) -- Real-time performance claims for multi-hand, 95.7% palm detection precision
- [MediaPipe Wrong Handedness Issue #4785](https://github.com/google/mediapipe/issues/4785) -- Known handedness misclassification reports

### Tertiary (LOW confidence)
- Web search results for multi-hand performance -- No specific browser benchmarks found for numHands=2 vs numHands=1. Performance impact is estimated from architectural understanding (landmark inference scales linearly with detected hands, palm detection is amortized).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; `numHands: 2` is a documented config option on the already-installed `@mediapipe/tasks-vision@0.10.32`
- Architecture: HIGH - All patterns derived from reading the existing codebase and the MediaPipe result structure. Two `GestureState` instances keyed by handedness is the obvious pattern.
- Pitfalls: MEDIUM - Handedness mirroring behavior verified with official docs. Performance impact estimated but not benchmarked. Same-handedness conflict rate is estimated from accuracy figures.

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days -- stable domain, no API changes expected)
