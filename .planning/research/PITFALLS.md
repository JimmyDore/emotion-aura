# Domain Pitfalls

**Domain:** Real-time browser-based computer vision with ML inference + WebGL particle rendering
**Project:** Emotion Aura
**Researched:** 2026-02-06
**Overall confidence:** MEDIUM (based on training data; WebSearch unavailable for verification of latest API changes)

---

## Critical Pitfalls

Mistakes that cause rewrites, missed performance targets, or architectural dead ends.

---

### Pitfall 1: Running Multiple MediaPipe Models on the Main Thread

**What goes wrong:** Developers instantiate both FaceLandmarker and HandLandmarker (or the older holistic solution) and call `detectForVideo()` on both every frame, on the main thread. Each model call takes 15-40ms depending on hardware. Two calls per frame = 30-80ms just for inference, leaving zero budget for rendering at 30 FPS (33ms frame budget).

**Why it happens:** MediaPipe's "Getting Started" examples show single-model usage. Nothing warns you that stacking two models sequentially blows your frame budget. The demos look fast because they only run one model at a time.

**Consequences:**
- Frame rate drops to 10-18 FPS immediately
- UI becomes unresponsive (main thread blocked)
- Particle rendering stutters visibly
- Users perceive the app as broken

**Warning signs:**
- `requestAnimationFrame` callback takes > 33ms in DevTools Performance panel
- "Long Task" warnings in Chrome DevTools
- Particle system hitches every time ML inference runs
- FPS counter shows bimodal distribution (fast frames when ML skips, slow when it runs)

**Prevention:**
1. **Use Web Workers for ML inference.** Offload MediaPipe calls to a dedicated worker. Send video frames via `OffscreenCanvas` (or `ImageBitmap` transfer) to the worker, receive landmarks back via `postMessage`. This frees the main thread entirely for rendering.
2. **Stagger model execution.** Don't run face AND hand detection on every frame. Run face detection on even frames, hand detection on odd frames. At 30 FPS input, each model runs at 15 Hz -- still perceptually smooth for landmark tracking.
3. **Use MediaPipe's GPU delegate (WebGPU/WebGL backend).** Ensure `delegate: 'GPU'` is set in task options. CPU fallback is 3-5x slower.
4. **Measure early.** Add an FPS counter in Phase 1 and never remove it during development.

**Phase mapping:** Must be addressed in Phase 1 (webcam + ML pipeline setup). Getting this wrong means rebuilding the entire inference pipeline later.

**Confidence:** HIGH -- this is a well-documented constraint of browser-based ML inference. MediaPipe documentation explicitly discusses GPU delegates, and the frame budget math is straightforward.

---

### Pitfall 2: getUserMedia Resolution/Framerate Mismatch

**What goes wrong:** The webcam is requested at default resolution (often 1280x720 or 1920x1080 on modern cameras). This massive frame is then fed to MediaPipe, which internally resizes it. Meanwhile, the large canvas also taxes compositing. The developer never realizes the bottleneck is the input resolution, not the model.

**Why it happens:** `navigator.mediaDevices.getUserMedia({ video: true })` uses the camera's default resolution. On MacBooks this is often 1080p. Developers assume "higher res = better detection" but MediaPipe internally downscales to ~256x256 or 192x192 for inference anyway.

**Consequences:**
- Wasted GPU bandwidth copying/processing oversized frames
- Higher memory usage (1080p RGBA = ~8MB per frame)
- Slower `drawImage` calls for canvas overlay
- No improvement in detection quality

**Warning signs:**
- `videoWidth` / `videoHeight` on the video element shows > 640 in either dimension
- Memory usage climbs higher than expected
- Canvas `drawImage` appears in Performance profiler hot path

**Prevention:**
1. **Constrain getUserMedia explicitly:**
   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({
     video: {
       width: { ideal: 640 },
       height: { ideal: 480 },
       frameRate: { ideal: 30, max: 30 }
     }
   });
   ```
2. **Process at even lower resolution for ML.** Draw the video to a small offscreen canvas (320x240) before sending to MediaPipe. Display the original 640x480 feed to the user.
3. **Cap the frame rate.** Don't let the camera deliver 60 FPS if you only need 30 for ML. Extra frames waste processing.

**Phase mapping:** Phase 1 (webcam setup). This is a one-line fix but must be done from the start.

**Confidence:** HIGH -- getUserMedia constraint API is stable and well-documented. MediaPipe's internal resolution behavior is documented in their model cards.

---

### Pitfall 3: WebGL Context Loss During Heavy ML Inference

**What goes wrong:** When MediaPipe uses the WebGL backend for inference AND Three.js/custom WebGL uses a separate WebGL context for rendering, the browser can lose one of the contexts under GPU memory pressure. The browser shows a blank canvas or throws `CONTEXT_LOST_WEBGL` events. On some devices, the entire tab crashes.

**Why it happens:** Browsers limit the number of active WebGL contexts (typically 8-16). MediaPipe's internal WebGL context counts against this limit. If the particle system, the video overlay, and MediaPipe each create their own context, you're at 3 already. Add Chrome DevTools and extensions, and you can hit the limit.

**Consequences:**
- Black screen (particle system disappears)
- MediaPipe silently stops returning results
- Hard to debug because context loss is non-deterministic
- Different behavior across devices and browsers

**Warning signs:**
- Intermittent black flashes on the particle canvas
- `webglcontextlost` event fires on your rendering canvas
- Application works on powerful machines but fails on mid-range laptops
- Works in Chrome but fails in Firefox (different context limits)

**Prevention:**
1. **Handle context loss gracefully.** Listen for `webglcontextlost` and `webglcontextrestored` events. Re-initialize renderer state on restore.
   ```javascript
   canvas.addEventListener('webglcontextlost', (e) => {
     e.preventDefault(); // Required to allow restoration
     pauseRendering();
   });
   canvas.addEventListener('webglcontextrestored', () => {
     reinitializeRenderer();
     resumeRendering();
   });
   ```
2. **Minimize context count.** Use a single WebGL context for rendering if possible. If using Three.js, render the video as a texture on a quad within the same scene rather than using a separate 2D canvas.
3. **Consider using MediaPipe's WebGPU delegate** (if available in the target MediaPipe version) to separate the compute and rendering backends.
4. **Test on constrained hardware.** Use Chrome's `--max-active-webgl-contexts=4` flag during development to catch this early.

**Phase mapping:** Phase 2 (particle system setup) and Phase 3 (integration). The integration phase is where this most commonly surfaces.

**Confidence:** MEDIUM -- WebGL context limits are well-established, but the specific interaction between MediaPipe's internal context and Three.js may vary by MediaPipe version. The context loss recovery pattern is standard WebGL practice.

---

### Pitfall 4: Emotion Classification Instability (Flickering Predictions)

**What goes wrong:** The emotion classifier outputs a new prediction every frame. Due to natural facial micro-movements, slight head rotations, and lighting changes, predictions rapidly oscillate between emotions (e.g., "neutral" -> "happy" -> "neutral" -> "surprised" -> "neutral" every few frames). The particle system visually seizures as it tries to respond to each change.

**Why it happens:** Raw ML predictions are noisy. A classifier might output `{happy: 0.35, neutral: 0.33, surprised: 0.32}` -- essentially uncertain -- and the argmax flips between classes on tiny input variations. Most emotion classification tutorials show single-image inference, not continuous video streams.

**Consequences:**
- Particle system constantly changes colors/behaviors -- visual chaos
- Transitions never complete (always interrupting each other)
- Users feel the system is "jittery" or "broken"
- The meditative/organic aesthetic is completely destroyed

**Warning signs:**
- Emotion label changes more than 2-3 times per second during testing
- Particle color keeps shifting without the user changing expression
- Transition animations never reach their end state
- Users report the experience feels "nervous" or "glitchy"

**Prevention:**
1. **Temporal smoothing with exponential moving average (EMA).** Don't use raw per-frame predictions. Maintain a running average:
   ```javascript
   // For each emotion score
   smoothedScore = alpha * rawScore + (1 - alpha) * smoothedScore;
   // alpha = 0.1 to 0.2 gives 5-10 frame smoothing
   ```
2. **Hysteresis threshold.** Require the new dominant emotion to exceed the current one by a margin (e.g., 15-20%) before switching:
   ```javascript
   if (newEmotionScore > currentEmotionScore + HYSTERESIS_MARGIN) {
     switchEmotion(newEmotion);
   }
   ```
3. **Minimum dwell time.** Once an emotion is selected, don't allow a switch for at least 500ms-1s. This prevents rapid flipping.
4. **Confidence gating.** If no emotion exceeds a minimum confidence threshold (e.g., 50%), stay on the current emotion rather than switching to a low-confidence prediction.
5. **Blend, don't switch.** The particle system should interpolate between emotion states rather than hard-switching. Use the smoothed probability distribution to blend particle behaviors proportionally.

**Phase mapping:** Phase 2 (emotion classification) -- must be designed with smoothing from the start. Do NOT build the particle system assuming clean emotion signals.

**Confidence:** HIGH -- temporal instability in per-frame classification is a universally documented problem in real-time ML applications. The smoothing techniques are standard signal processing.

---

### Pitfall 5: Particle System GPU Overdraw and Fill Rate Saturation

**What goes wrong:** The developer creates thousands of translucent, additively-blended particles with large billboard sprites. On each frame, the GPU must blend each particle fragment with what's behind it. With 5000+ overlapping translucent particles, the GPU fill rate becomes the bottleneck. The system drops to 15 FPS even though vertex processing is fast.

**Why it happens:** Particle tutorials show beautiful effects with thousands of particles but test on high-end GPUs. Additive blending with large, overlapping sprites has quadratic cost in overlap regions. The "organic/fluid" aesthetic this project requires needs soft-edged, semi-transparent particles -- exactly the kind that cause overdraw.

**Consequences:**
- Smooth on development machine (likely high-end), stutters on target audience hardware
- FPS drops scale non-linearly with particle count (adding 10% more particles can drop FPS by 30%)
- GPU-bound (CPU profiler shows idle time but FPS is still low)
- Can't simply "turn down particle count" without degrading the visual effect

**Warning signs:**
- FPS drops when particles cluster together (overlap increases) but recovers when spread out
- Performance profiler shows GPU bottleneck, not CPU
- Reducing particle SIZE improves performance more than reducing COUNT
- Moving the camera further away (making particles smaller on screen) improves FPS

**Prevention:**
1. **Budget particles strictly.** Start with 500-1000 particles max. Optimize the visual effect within this budget rather than adding more.
2. **Use instanced rendering.** THREE.InstancedBufferGeometry or equivalent. One draw call for all particles, not one per particle.
3. **Small sprites, fake the softness.** Use small billboard quads (8x8 to 32x32 px on screen) with soft-edge textures. The "organic" look comes from motion and color, not from giant transparent blobs.
4. **Reduce overdraw with depth tricks:**
   - Sort particles back-to-front only when necessary (or don't sort -- for additive blending, order doesn't matter)
   - Use premultiplied alpha
   - Consider writing a custom shader that fakes volumetric appearance without actual transparency
5. **Profile on target hardware.** Use Chrome's GPU profiling and test on integrated GPUs (Intel Iris, Apple M1 integrated). If it runs at 30 FPS on integrated graphics, it'll fly on discrete GPUs.
6. **Dynamic particle budget.** Measure FPS continuously and reduce particle count/size if dropping below target:
   ```javascript
   if (currentFPS < TARGET_FPS * 0.9) {
     particleBudget = Math.max(MIN_PARTICLES, particleBudget * 0.95);
   }
   ```

**Phase mapping:** Phase 2/3 (particle system design). The particle budget and rendering approach must be decided early -- "we'll optimize later" is the trap.

**Confidence:** HIGH -- GPU fill rate as a bottleneck for translucent particle systems is fundamental graphics knowledge, not library-specific.

---

## Moderate Pitfalls

Mistakes that cause delays, significant technical debt, or degraded user experience.

---

### Pitfall 6: MediaPipe Initialization Cold Start

**What goes wrong:** MediaPipe models (FaceLandmarker, HandLandmarker) require downloading WASM binaries and model files on first load. The FaceLandmarker model alone is ~5-10MB. Combined with hand tracking, initial load can be 15-25MB. On average connections, users stare at a blank screen for 5-15 seconds.

**Why it happens:** Developers test on localhost with cached files. They never experience the cold-start latency that real users face.

**Consequences:**
- Users think the app is broken and leave
- Portfolio reviewers (the target audience!) won't wait -- they'll close the tab
- No visual feedback during loading destroys first impression

**Prevention:**
1. **Progressive loading with visual feedback.** Show an engaging loading screen with progress indication. Load face detection first (the primary experience), hand detection second.
2. **Preload models.** Use `<link rel="preload">` for the WASM and model files if their URLs are known.
3. **Start the webcam during model load.** Request camera permissions AND download models in parallel. Show the raw webcam feed immediately so users see something alive.
4. **Cache aggressively.** Set proper cache headers (or use Service Worker) so repeat visits are instant.
5. **Show a "calibrating" phase.** After models load, run a few inference cycles before declaring "ready." This hides the first-inference warmup.

**Phase mapping:** Phase 1 (initial setup) and Phase 4 (polish). Basic loading state in Phase 1, polished loading experience in Phase 4.

**Confidence:** HIGH -- MediaPipe model sizes are documented, and network latency for multi-MB downloads is straightforward.

---

### Pitfall 7: Hand Gesture Recognition False Positives

**What goes wrong:** The developer maps raw hand landmark positions directly to gestures (e.g., "if all fingers extended = open hand"). But MediaPipe's hand landmarks jitter, partially-visible hands produce garbage landmarks, and the gesture classifier triggers on random hand positions during natural movement. The particle system randomly pushes/attracts when the user is just resting their hand.

**Why it happens:** Gesture recognition from landmarks looks trivially simple in tutorials. The reality of noisy, jittery landmarks in real-time is much harder. Users don't hold perfect poses -- they transition fluidly between gestures.

**Consequences:**
- Particles randomly react when user isn't intending to gesture
- Users feel they have no control -- the system seems to do random things
- "Push" and "attract" trigger during neutral hand positions
- The interaction feels broken rather than magical

**Warning signs:**
- Gestures trigger when hand is in peripheral view
- Gestures change during hand movement (transition between poses)
- Works when hand is perfectly positioned, fails during natural use
- Different users get wildly different gesture recognition quality

**Prevention:**
1. **Require gesture stability.** A gesture must be held for 3-5 consecutive frames before activating. This filters transient false detections.
2. **Define a "dead zone" / neutral state.** Not every hand position is a gesture. If landmarks don't clearly match any defined gesture with high confidence, treat it as "no gesture." Default to no interaction.
3. **Use confidence thresholds on the hand detection itself.** MediaPipe returns a confidence score for hand detection. Ignore hands detected with < 70% confidence.
4. **Smooth landmark positions.** Apply the same EMA smoothing used for emotions to hand landmark positions. This reduces jitter that causes false gesture transitions.
5. **Define gestures with margin.** Instead of "all fingers extended," use "all fingertip-to-palm distances exceed threshold X by margin Y." This prevents edge-case flickering.
6. **Activation zone.** Only recognize gestures when the hand is in the central 60-70% of the frame. Hands at edges produce unreliable landmarks.

**Phase mapping:** Phase 3 (hand gesture integration). Build the gesture classifier as a separate, testable module with configurable thresholds.

**Confidence:** HIGH -- hand landmark jitter is a well-documented MediaPipe characteristic, and gesture recognition from landmarks is a known hard problem in the HCI literature.

---

### Pitfall 8: Particle-to-Webcam Coordinate Mapping Errors

**What goes wrong:** MediaPipe returns landmarks in normalized coordinates (0-1 range, relative to image). The particle system uses its own coordinate space (WebGL clip space, Three.js world coordinates, or pixel space). The developer maps between these incorrectly, causing particles to react to hand positions that don't align with what the user sees. A hand on the left side of the screen pushes particles on the right.

**Why it happens:** There are at least 4 coordinate spaces in play:
1. MediaPipe normalized coords (0-1, origin top-left, X is MIRRORED because webcam)
2. Canvas pixel coords
3. WebGL clip space (-1 to 1, origin center, Y-up)
4. Three.js world coords (arbitrary, depends on camera setup)

The mirroring is the most common trap. Webcam feeds are typically displayed mirrored (selfie-mode) so the user's left hand appears on the left of the screen. But MediaPipe landmarks use the original (non-mirrored) coordinate system.

**Consequences:**
- Hand pushes particles in the wrong direction
- Particles cluster at the opposite side from the hand
- Interaction feels "inverted" or "random"
- Extremely confusing to debug because everything looks correct in isolation

**Warning signs:**
- Horizontal hand movements produce inverted particle responses
- Particles respond correctly vertically but inversely horizontally
- Works "backwards" -- moving hand right pushes particles left
- "It works if I mirror the video" -- a sign the coordinate mapping is wrong

**Prevention:**
1. **Document all coordinate spaces upfront.** Before writing code, write down the mapping chain: MediaPipe -> [transform] -> render coords.
2. **Handle the mirror explicitly:**
   ```javascript
   // If displaying mirrored video (typical for webcam):
   const screenX = 1.0 - landmark.x; // Flip horizontal
   const screenY = landmark.y;       // Keep vertical
   ```
3. **Build a debug visualization.** Overlay raw landmark positions on the video feed as colored dots. Verify visually that they align with facial/hand features BEFORE connecting them to the particle system.
4. **Use a single coordinate space for all interactions.** Convert everything to one space (e.g., normalized 0-1, origin top-left, mirrored) at the boundary, then work consistently within it.

**Phase mapping:** Phase 1 (landmark visualization/debug) and Phase 3 (integration). Build the debug overlay first, verify coordinates, then connect to particles.

**Confidence:** HIGH -- coordinate space confusion between mirrored video and ML landmarks is one of the most commonly reported issues in webcam-based interactive projects.

---

### Pitfall 9: requestAnimationFrame Timing Conflicts

**What goes wrong:** The developer creates separate `requestAnimationFrame` loops for: (a) reading the webcam, (b) running ML inference, (c) updating particles, (d) rendering. These loops drift apart, causing visual inconsistencies -- particles respond to landmarks from 2-3 frames ago, or the render runs twice per inference, or frames are skipped unpredictably.

**Why it happens:** Each subsystem (video capture, ML, rendering) has its own tutorial showing its own rAF loop. Combining them naively creates multiple competing loops.

**Consequences:**
- Input lag between gesture and particle response
- Inconsistent frame timing causes visible judder
- Hard to profile because the system has multiple interlocking timers
- Energy waste (running loops faster than necessary)

**Prevention:**
1. **Single rAF loop as the heartbeat.** One `requestAnimationFrame` callback that orchestrates everything:
   ```javascript
   function mainLoop(timestamp) {
     requestAnimationFrame(mainLoop);

     // 1. Read webcam frame
     captureFrame();

     // 2. Run ML (or check if worker has results)
     const landmarks = getLatestLandmarks();

     // 3. Update particle physics
     updateParticles(landmarks, deltaTime);

     // 4. Render
     renderer.render(scene, camera);
   }
   ```
2. **Decouple ML from render frequency.** ML inference can run at a lower rate (15-20 Hz) while rendering runs at full rAF rate (60 Hz). Use the latest available ML results for each render frame, interpolating if needed.
3. **Use timestamps, not frame counts.** Base all physics on `deltaTime` from the rAF timestamp, not on "one tick per frame." This handles variable frame rates gracefully.

**Phase mapping:** Phase 1 (architecture setup). The main loop structure must be designed once and correctly from the start.

**Confidence:** HIGH -- rAF timing is core browser API knowledge, and the single-loop pattern is standard in game development.

---

### Pitfall 10: Safari and Firefox Compatibility Traps

**What goes wrong:** The developer builds and tests exclusively in Chrome. MediaPipe's web runtime has the best support in Chromium browsers. Safari has WebGL limitations, older WASM support, and different getUserMedia behavior. Firefox has different WebGL extension support. The app works in Chrome but breaks partially or completely in other browsers.

**Why it happens:** Chrome is the default development browser. MediaPipe is a Google project optimized for Chrome. Safari and Firefox are afterthoughts in the MediaPipe ecosystem.

**Consequences:**
- Safari: MediaPipe may fail to initialize, WebGL shaders may not compile, getUserMedia may request permissions differently
- Firefox: WebGL extensions missing, performance characteristics different, WebWorker + OffscreenCanvas support may differ
- Portfolio reviewers might use any browser -- a broken experience in Safari is a failed portfolio piece

**Warning signs:**
- Never testing in non-Chrome browsers until "polish" phase
- Using Chrome-specific WebGL extensions without checking availability
- Using OffscreenCanvas without feature detection (Safari added it relatively recently)

**Prevention:**
1. **Test in all target browsers from Phase 1.** Run the initial webcam + basic ML pipeline in Chrome, Firefox, and Safari before building further.
2. **Feature-detect, don't browser-detect:**
   ```javascript
   const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
   const hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
   ```
3. **Have fallback paths.** If OffscreenCanvas isn't available, run ML on main thread with frame-skipping. If WebGL2 isn't available, use WebGL1 shaders.
4. **Pin MediaPipe to a known-working version.** Don't use `latest` -- use a specific version tested across browsers.
5. **Scope the project spec realistically.** PROJECT.md says "Chrome, Firefox, Safari." Consider making Safari a best-effort target and documenting known limitations rather than spending 40% of dev time on Safari compat.

**Phase mapping:** Every phase. Cross-browser testing is continuous, not a final step.

**Confidence:** MEDIUM -- specific Safari/Firefox compatibility details for the latest MediaPipe versions would need verification against current release notes. The general principle of cross-browser issues is HIGH confidence.

---

### Pitfall 11: Emotion Classification Model Choice and Accuracy

**What goes wrong:** The developer spends weeks building a custom emotion classifier from facial landmarks, only to find it's inaccurate because landmark-to-emotion mapping is genuinely hard. Or they use face-api.js which bundles large models and has accuracy issues of its own. The emotion detection feels unreliable, undermining the entire product.

**Why it happens:** Emotion detection seems simple ("happy people smile, landmarks curve up") but facial expression analysis has decades of research precisely because it's nuanced. Action Unit (AU) based approaches need careful calibration. Pre-trained models may not generalize across ethnicities, lighting conditions, or camera angles.

**Consequences:**
- Users make exaggerated faces and still get wrong emotions detected
- The system seems to just randomly assign emotions
- Users lose faith in the core feature
- Developer enters a rabbit hole of ML model tuning

**Warning signs:**
- "Neutral" is predicted 80%+ of the time
- Emotion only changes when making extreme facial expressions
- Different people get very different accuracy
- Lighting changes cause emotion prediction changes

**Prevention:**
1. **Use a pragmatic approach.** For a portfolio demo, you don't need research-grade accuracy. A simple heuristic classifier on MediaPipe Face Mesh landmarks can work:
   - Smile detection: mouth corner distance vs. mouth center distance ratio
   - Surprise: mouth openness + eyebrow raise
   - Angry: brow furrow (inner eyebrow distance decrease)
   - Sad: mouth corners down + brow configuration
2. **Validate with 3-4 test users early.** If your simple classifier works for diverse faces in Phase 2, move on. Don't over-engineer.
3. **Make it feel right, not be right.** The particle response to emotions doesn't need to be scientifically accurate. It needs to feel responsive and delightful. A slightly wrong but stable prediction is better than a correct but flickering one.
4. **Consider using a pre-trained model but keep it small.** TensorFlow.js has face expression models that can run efficiently. The tradeoff is bundle size vs. accuracy.
5. **Always have a fallback to "neutral."** If confidence is low, default to the calm ambient particles. This is better than a wrong prediction.

**Phase mapping:** Phase 2 (emotion detection). Prototype the simple heuristic approach first. Only invest in a heavier model if the heuristics clearly fail.

**Confidence:** MEDIUM -- the general challenge of facial emotion recognition is well-established. Specific accuracy achievable with MediaPipe Face Mesh landmarks depends on implementation details and would benefit from empirical testing.

---

## Minor Pitfalls

Mistakes that cause annoyance, minor delays, or polish issues.

---

### Pitfall 12: Memory Leaks from Unmanaged MediaPipe Results

**What goes wrong:** Each call to `detect()` or `detectForVideo()` in MediaPipe's Tasks API returns result objects containing landmark arrays. If these aren't properly consumed and the old references aren't released, memory slowly climbs over a session. After 10-15 minutes, the tab uses 1-2GB and starts garbage collecting aggressively, causing frame drops.

**Why it happens:** In high-frequency loops (30 FPS = 1800 calls/minute), even small leaks compound fast. Developers focus on getting the pipeline working and don't monitor memory over time.

**Prevention:**
1. **Reuse result objects where possible.** Some MediaPipe API versions support result listeners that reuse internal buffers.
2. **Null out references after processing.** Don't store the full result object persistently -- extract the data you need and let the result be garbage collected.
3. **Profile memory over time.** Use Chrome's Memory tab to take heap snapshots at 1 minute and 10 minutes. Compare.
4. **Watch for Three.js geometry/texture leaks too.** If creating new particle geometries or textures dynamically, call `.dispose()` on old ones.

**Phase mapping:** Phase 4 (polish/stability). Memory leaks are usually found during extended testing.

**Confidence:** MEDIUM -- memory management patterns are standard, but specific MediaPipe result object lifecycle details depend on the version in use.

---

### Pitfall 13: Webcam Permission UX Failure

**What goes wrong:** The app calls `getUserMedia` immediately on page load. The browser shows a permission prompt, but the user hasn't been told why the app needs their camera. They deny permission, and the app shows nothing useful. No recovery path is offered.

**Why it happens:** Developers always click "Allow" during testing. They never experience the deny path.

**Prevention:**
1. **Show a "Start Experience" button.** Explain what the camera will be used for before requesting permission. Only call getUserMedia after the user clicks.
2. **Handle all rejection paths:**
   - User denies: Show clear message with instructions to re-enable in browser settings
   - No camera found: Show message suggesting they need a webcam
   - Camera in use by another app: Specific message for this case
3. **Test the deny path and the no-camera path explicitly.**

**Phase mapping:** Phase 1 (webcam setup) and Phase 4 (polish).

**Confidence:** HIGH -- getUserMedia permission API behavior is well-documented.

---

### Pitfall 14: Three.js Scene Disposal and Hot Reload Issues

**What goes wrong:** During development with HMR (Hot Module Replacement), each code change creates a new Three.js renderer, scene, and particle system without properly disposing of the old one. After a few edits, there are 5 zombie renderers consuming GPU memory. Performance appears to degrade "randomly" during development.

**Why it happens:** Three.js doesn't auto-clean-up. HMR replaces JavaScript modules but doesn't call cleanup functions unless you explicitly wire them up.

**Prevention:**
1. **Implement cleanup in module teardown:**
   ```javascript
   // Vite HMR cleanup
   if (import.meta.hot) {
     import.meta.hot.dispose(() => {
       renderer.dispose();
       scene.traverse((obj) => {
         if (obj.geometry) obj.geometry.dispose();
         if (obj.material) obj.material.dispose();
       });
     });
   }
   ```
2. **Watch for multiple canvases appearing in the DOM during development.** If you see more than one, cleanup isn't working.

**Phase mapping:** Phase 1 (project setup). Configure HMR cleanup when setting up the renderer.

**Confidence:** HIGH -- Three.js disposal requirements are well-documented, and HMR cleanup patterns are standard in Vite/Webpack projects.

---

### Pitfall 15: Particle Physics Framerate Dependence

**What goes wrong:** Particle position updates use fixed increments per frame (`particle.x += velocity * 0.1`) instead of delta-time-based updates. At 60 FPS particles move twice as fast as at 30 FPS. When ML inference causes temporary frame drops, particles slow down visibly. The physics feels inconsistent.

**Why it happens:** Simple particle tutorials use per-frame updates. It works until frame rate varies, which it will because ML inference is bursty.

**Prevention:**
1. **Always use delta time:**
   ```javascript
   const dt = (timestamp - lastTimestamp) / 1000; // seconds
   particle.x += velocity * dt;
   ```
2. **Clamp delta time to prevent explosion after tab-switch:**
   ```javascript
   const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1); // Cap at 100ms
   ```
3. **This is a day-one decision.** Don't retrofit it later.

**Phase mapping:** Phase 2 (particle system foundation).

**Confidence:** HIGH -- delta-time physics is fundamental game development knowledge.

---

## Phase-Specific Warning Summary

| Phase Topic | Likely Pitfall(s) | Severity | Mitigation |
|-------------|-------------------|----------|------------|
| Phase 1: Webcam + ML Pipeline | P1 (main thread blocking), P2 (resolution), P9 (rAF timing), P13 (permissions UX) | CRITICAL | Architecture must separate ML from rendering from day one. Worker-based or staggered inference. Constrain video resolution. Single rAF loop. |
| Phase 2: Emotion Detection + Particles | P4 (emotion flickering), P5 (GPU overdraw), P11 (model accuracy), P15 (framerate dependence) | CRITICAL | Build smoothing/hysteresis into emotion pipeline. Budget particles strictly. Use delta-time physics. Start with simple heuristic classifier. |
| Phase 3: Hand Gesture Integration | P7 (false positives), P8 (coordinate mapping) | MODERATE | Gesture stability requirements. Debug overlay for coordinates. Dead zone / neutral state. |
| Phase 4: Polish + Cross-browser | P6 (cold start), P10 (browser compat), P12 (memory leaks), P14 (disposal) | MODERATE | Loading experience. Cross-browser testing. Memory profiling. Proper cleanup. |

---

## Meta-Pitfall: "Works on My Machine" Performance Testing

The single most dangerous meta-pitfall for this project: **developing on a powerful machine and never testing on constrained hardware.** A MacBook Pro M3 with 16GB RAM will run almost anything smoothly. But portfolio reviewers may use a 2020 Intel MacBook, a Chromebook, or a Windows laptop with integrated graphics.

**Prevention:** Early in development, test on the least powerful device available. If you only have one machine, use Chrome's CPU/GPU throttling in DevTools. Set a performance budget: if it doesn't run at 30 FPS with 4x CPU slowdown, optimize before adding features.

---

## Sources and Confidence Notes

All findings in this document are based on training data (knowledge cutoff: May 2025). WebSearch was unavailable during this research session, so the following caveats apply:

- **MediaPipe Tasks API specifics** (model sizes, delegate options, exact API signatures): MEDIUM confidence. The API was evolving rapidly through 2024-2025. Verify against current @mediapipe/tasks-vision documentation.
- **Three.js patterns** (instanced rendering, disposal): HIGH confidence. These are stable, well-documented patterns.
- **WebGL fundamentals** (context limits, fill rate, coordinate spaces): HIGH confidence. These are browser platform fundamentals that change slowly.
- **Browser compatibility specifics** (Safari support for OffscreenCanvas, WebGL2): MEDIUM confidence. Safari support improves with each release. Check caniuse.com for current status.
- **Emotion classification accuracy claims**: LOW-MEDIUM confidence. Accuracy depends heavily on specific model architecture, training data, and deployment conditions. Empirical testing is essential.

**Items flagged for verification during implementation:**
1. Current MediaPipe Tasks Vision package version and API shape
2. Safari OffscreenCanvas and Web Worker support status in 2026
3. MediaPipe WebGPU delegate availability and browser support
4. face-api.js maintenance status (may be abandoned -- verify before adopting)
