# Feature Landscape

**Domain:** Real-time webcam computer vision demo app (emotion detection + gesture interaction + particle visualization)
**Project:** Emotion Aura
**Researched:** 2026-02-06
**Source basis:** Training knowledge (WebSearch/WebFetch unavailable). Confidence levels flagged per item.

---

## Table Stakes

Features users expect. Missing any of these and the demo feels broken, unfinished, or amateurish.

### TS-1: Webcam Access and Live Feed Display
| Aspect | Detail |
|--------|--------|
| **What** | Request camera permission, display live video feed in browser |
| **Why expected** | The entire app is built on webcam input; without this, nothing works |
| **Complexity** | Low |
| **Confidence** | HIGH (well-understood browser API: `getUserMedia`) |
| **Notes** | Must handle permission denied gracefully. Must show what the camera sees so users can position themselves. Mirror the feed (CSS `transform: scaleX(-1)`) or users get confused by reversed movement. |
| **Dependencies** | None -- this is the foundation everything else builds on |

### TS-2: Real-Time Face Detection and Tracking
| Aspect | Detail |
|--------|--------|
| **What** | Detect face presence, track face position and landmarks in real-time |
| **Why expected** | Emotion detection requires face landmarks; if the face isn't tracked, nothing downstream works |
| **Complexity** | Medium (ML model loading, inference pipeline) |
| **Confidence** | HIGH (MediaPipe Face Landmarker is well-established for this) |
| **Notes** | MediaPipe Face Landmarker provides 478 face mesh landmarks and 52 blendshape coefficients. The blendshapes are the key output for emotion classification -- they describe muscle activations (e.g., `browInnerUp`, `mouthSmileLeft`, `jawOpen`). Must handle face loss gracefully (user looks away, covers face). |
| **Dependencies** | TS-1 (webcam feed) |

### TS-3: Emotion Classification from Face Data
| Aspect | Detail |
|--------|--------|
| **What** | Classify detected face into emotion categories: happy, sad, angry, surprised, neutral |
| **Why expected** | Core premise of the app. If emotions aren't detected, the particle system has no input signal. |
| **Complexity** | Medium-High |
| **Confidence** | MEDIUM (approach is sound, but the classification layer needs careful design) |
| **Notes** | Two viable approaches: (A) Use MediaPipe blendshapes as input to a lightweight classifier (rule-based or small neural net). (B) Use face-api.js which has a built-in expression recognition model. Approach A is recommended -- blendshape-based rules are transparent and tunable (e.g., `mouthSmileLeft + mouthSmileRight > threshold` = happy). Approach B adds a second ML library and its own face detection, which is redundant and heavier. Output should be a probability distribution across emotions, not a hard classification, to enable smooth particle transitions. |
| **Dependencies** | TS-2 (face landmarks/blendshapes) |

### TS-4: Particle System Rendering
| Aspect | Detail |
|--------|--------|
| **What** | Render a large number of particles (500-5000+) with smooth movement, color, and size variation |
| **Why expected** | The visual output IS the product. If particles look janky, static, or like a 2005 Flash demo, the entire project fails. |
| **Complexity** | Medium-High |
| **Confidence** | HIGH (WebGL particle systems via Three.js or raw WebGL are well-established) |
| **Notes** | Must use GPU-accelerated rendering (WebGL). CPU-based Canvas2D will not scale to enough particles at 30 FPS. Three.js `Points` / `BufferGeometry` or instanced meshes are the standard approach. Particle count, color, velocity, size, and behavior must all be parameterized and driven by emotion state. |
| **Dependencies** | None for rendering; TS-3 for data-driven behavior |

### TS-5: Emotion-to-Particle Mapping
| Aspect | Detail |
|--------|--------|
| **What** | Each emotion drives distinct visual behavior: colors, movement patterns, particle count, speed, shape |
| **Why expected** | This is the "aura" concept. If all emotions look the same, there's no point to the emotion detection. |
| **Complexity** | Medium |
| **Confidence** | HIGH (design/tuning problem, not a technical risk) |
| **Notes** | Per PROJECT.md: Happy = colorful/lively, Sad = blue rain/slow, Angry = red-orange flames/aggressive, Surprised = burst/explosion, Neutral = calm ambient. Each mapping needs: color palette, velocity range, particle count, spawn pattern, lifetime, size curve, movement algorithm. These should be defined as configuration objects, not hardcoded, to enable tuning. |
| **Dependencies** | TS-3 (emotion data), TS-4 (particle system) |

### TS-6: Smooth Transitions Between Emotion States
| Aspect | Detail |
|--------|--------|
| **What** | When detected emotion changes, particles morph smoothly rather than popping instantly |
| **Why expected** | Without transitions, the visual experience is jarring and feels broken. Emotions flicker in detection, so hard switches would cause seizure-like visual chaos. |
| **Complexity** | Medium |
| **Confidence** | HIGH (standard interpolation/easing techniques) |
| **Notes** | Interpolate ALL particle parameters (color, velocity, size, spawn rate) over 0.5-2 seconds using easing functions. Use the emotion probability distribution (not argmax) to blend between states -- e.g., 70% happy + 30% surprised = mostly happy with some burst energy. This is critical for polish. A smoothing/damping layer on the emotion signal is essential to prevent rapid flickering. |
| **Dependencies** | TS-3 (continuous emotion probabilities), TS-5 (per-emotion configurations) |

### TS-7: Hand Landmark Detection
| Aspect | Detail |
|--------|--------|
| **What** | Detect hand presence and track 21 hand landmarks per hand in real-time |
| **Why expected** | Gesture interaction is a core feature per project spec. Can't recognize gestures without hand tracking. |
| **Complexity** | Medium |
| **Confidence** | HIGH (MediaPipe Hand Landmarker handles this) |
| **Notes** | MediaPipe Hand Landmarker detects 21 landmarks per hand. Can run simultaneously with Face Landmarker. Performance concern: running both face and hand models simultaneously is the biggest FPS risk. May need to stagger inference (face on frame N, hand on frame N+1) or reduce model complexity. |
| **Dependencies** | TS-1 (webcam feed) |

### TS-8: Gesture Recognition (Open Hand, Fist, Pinch)
| Aspect | Detail |
|--------|--------|
| **What** | Classify hand pose into three gestures: open hand (push), closed fist (attract), pinch (concentrate) |
| **Why expected** | Core interaction model per project spec. Without gesture recognition, the user is a passive observer. |
| **Complexity** | Medium |
| **Confidence** | MEDIUM (MediaPipe Gesture Recognizer has built-in gestures including open palm and closed fist; pinch may require custom logic) |
| **Notes** | Two approaches: (A) Use MediaPipe Gesture Recognizer task which has built-in recognition for several gestures including `Open_Palm` and `Closed_Fist`. (B) Compute gestures from hand landmarks directly using finger curl/extension heuristics. Approach B is recommended because it's lighter weight (no additional model), more tunable, and the three target gestures are geometrically simple. Open hand = all fingers extended. Fist = all fingers curled. Pinch = thumb tip close to index tip. Use distance and angle thresholds on landmark positions. |
| **Dependencies** | TS-7 (hand landmarks) |

### TS-9: Gesture-to-Particle Interaction
| Aspect | Detail |
|--------|--------|
| **What** | Hand position and gesture type affect particle behavior in real-time |
| **Why expected** | The payoff of gesture detection. If gestures are detected but particles don't react, the feature is pointless. |
| **Complexity** | Medium |
| **Confidence** | HIGH (physics simulation techniques are well-understood) |
| **Notes** | Map hand screen-space position to particle world coordinates. Apply forces: Open hand = repulsive radial force from hand position. Fist = attractive force toward hand position. Pinch = strong convergence force to a point. Force magnitude should scale with hand proximity to camera (closer hand = larger visual hand = stronger force). Needs smooth falloff (not a hard radius). |
| **Dependencies** | TS-8 (gesture type), TS-4 (particle physics) |

### TS-10: Permission and Error Handling UX
| Aspect | Detail |
|--------|--------|
| **What** | Handle camera permission denial, missing camera, model loading failures, and unsupported browsers gracefully |
| **Why expected** | A portfolio demo that crashes or shows a blank screen when something goes wrong looks unprofessional. |
| **Complexity** | Low |
| **Confidence** | HIGH (standard UX practice) |
| **Notes** | Show clear messages for: "Camera access denied -- here's how to enable it", "No camera detected", "Loading ML models... (progress indicator)", "Your browser doesn't support this feature". A loading screen with progress bar for model downloads (MediaPipe models are 5-15MB) is essential -- without it, users see a blank screen for several seconds and think the app is broken. |
| **Dependencies** | None |

### TS-11: Performance Target (30+ FPS)
| Aspect | Detail |
|--------|--------|
| **What** | Maintain 30+ FPS with webcam capture + ML inference + particle rendering all running simultaneously |
| **Why expected** | Below 30 FPS, the experience feels sluggish and "broken". Real-time means real-time. |
| **Complexity** | High (this is the hardest engineering challenge in the project) |
| **Confidence** | MEDIUM (achievable but requires careful optimization -- this is where most similar projects struggle) |
| **Notes** | Key strategies: (1) Reduce ML input resolution (process 320x240 even if displaying 1280x720). (2) Stagger inference -- don't run face + hand detection every frame; alternate or run at 15 FPS while rendering at 60 FPS. (3) Use WebGL for all rendering. (4) Use `requestAnimationFrame` properly. (5) Offload ML to Web Worker if supported. (6) Use the "lite" variants of MediaPipe models. (7) Profile and budget: ~10ms ML, ~6ms particles, ~1ms gesture logic = ~17ms per frame = 60 FPS headroom. |
| **Dependencies** | All features (this is a cross-cutting concern) |

---

## Differentiators

Features that set Emotion Aura apart from typical CV demos. Not expected, but create the "wow" factor that makes this portfolio-worthy.

### D-1: Organic/Fluid Particle Aesthetics
| Aspect | Detail |
|--------|--------|
| **What** | Particles that look organic, fluid, and beautiful -- not just colored dots. Soft edges, glow, trails, subtle noise-driven movement. |
| **Value proposition** | Most CV demos use ugly default visuals. Beautiful particles make this feel like an art installation, not a tech demo. This is the single biggest differentiator. |
| **Complexity** | High |
| **Confidence** | HIGH (shader techniques for this are well-documented) |
| **Notes** | Techniques: Custom fragment shaders for soft circular particles with glow falloff. Additive blending for ethereal glow. Per-particle opacity based on age/velocity. Perlin/simplex noise for organic drift. Motion trails via low-alpha previous frame compositing or dedicated trail geometry. Color palettes designed with intention (not random RGB). Consider: bloom post-processing, chromatic aberration on fast particles. |
| **Dependencies** | TS-4 (particle system must support custom shaders) |

### D-2: Particle Spawning Anchored to Face/Body Contour
| Aspect | Detail |
|--------|--------|
| **What** | Particles emanate from or orbit around the user's face/head silhouette, not from random screen positions |
| **Value proposition** | Creates the "aura" effect. Particles spawning from the face contour look intentional and magical. Random screen particles look disconnected from the user. |
| **Complexity** | Medium |
| **Confidence** | HIGH (face landmarks provide head contour data) |
| **Notes** | Use MediaPipe face mesh oval (landmarks along jawline, forehead, temples) to define a spawn region. Particles originate from this contour and radiate outward. Different emotions could change the spawn pattern: happy = particles rise upward from head like a halo, sad = particles drip downward from chin, angry = particles erupt outward in all directions. |
| **Dependencies** | TS-2 (face landmarks for contour), TS-4 (particle spawn system) |

### D-3: Emotion Intensity Scaling
| Aspect | Detail |
|--------|--------|
| **What** | Particle effect intensity scales with how strongly the emotion is expressed, not just which emotion is detected |
| **Value proposition** | A slight smile vs a big grin should look different. This makes the experience feel responsive and "alive" rather than binary. |
| **Complexity** | Low-Medium |
| **Confidence** | HIGH (blendshape values are continuous 0-1 floats) |
| **Notes** | MediaPipe blendshapes provide continuous values (0.0-1.0). Map magnitude to particle count, velocity, color saturation, glow intensity. Subtle emotion = few gentle particles. Strong emotion = dramatic particle explosion. This creates a feedback loop where users naturally try to express emotions more strongly, which is engaging and fun. |
| **Dependencies** | TS-3 (continuous emotion values, not just categories) |

### D-4: Visual Gesture Feedback
| Aspect | Detail |
|--------|--------|
| **What** | Visual indicator showing the detected gesture and its effect radius, so users understand what's happening |
| **Value proposition** | Without feedback, users don't know if their gesture was recognized. With it, the interaction feels responsive and learnable. |
| **Complexity** | Low |
| **Confidence** | HIGH (standard UI feedback pattern) |
| **Notes** | Render a subtle circle/ring at the hand position showing the force field radius. Different visual for each gesture (e.g., expanding ring for push, contracting ring for attract, converging dot for pinch). Should be subtle enough not to distract from the particle aesthetic. Fade in when gesture detected, fade out when hand leaves frame. |
| **Dependencies** | TS-8 (gesture recognition), TS-4 (rendering layer) |

### D-5: Smooth Model Loading Experience
| Aspect | Detail |
|--------|--------|
| **What** | An engaging loading screen with progress indication while ML models download and initialize |
| **Value proposition** | MediaPipe models take 2-8 seconds to download. A polished loading experience prevents user abandonment and sets the tone. |
| **Complexity** | Low |
| **Confidence** | HIGH |
| **Notes** | Show a minimal particle animation (CPU-based, small count) during loading as a preview of what's coming. Display model loading progress. Transition smoothly from loading to live experience. Consider: preload models in a service worker for return visits. |
| **Dependencies** | TS-10 (error handling) |

### D-6: Onboarding / Calibration Moment
| Aspect | Detail |
|--------|--------|
| **What** | Brief guided moment when app starts: "Smile to begin" or similar prompt that teaches the user the app responds to their face |
| **Value proposition** | Users who don't understand what the app does will stare blankly and leave. A 5-second onboarding creates the "aha moment" instantly. |
| **Complexity** | Low |
| **Confidence** | HIGH (UX best practice) |
| **Notes** | After models load, show "Smile to start your aura" or similar. When smile detected, trigger a satisfying particle burst and transition to full experience. Optionally show gesture tutorial: "Try opening your hand near the particles." This can be skippable for return visitors. |
| **Dependencies** | TS-3 (emotion detection working), TS-4 (particle system ready) |

### D-7: FPS Counter / Debug Overlay (Developer Toggle)
| Aspect | Detail |
|--------|--------|
| **What** | Hidden debug overlay showing FPS, inference time, detected emotion probabilities, gesture state |
| **Value proposition** | Essential for development and tuning. Also impressive to show in portfolio context ("here's what's happening under the hood"). |
| **Complexity** | Low |
| **Confidence** | HIGH |
| **Notes** | Toggle with keyboard shortcut (e.g., `D` key). Show: FPS, ML inference time (ms), current emotion probabilities, active gesture, particle count. Keep hidden by default for clean UX. |
| **Dependencies** | All features (reads from all systems) |

### D-8: Responsive Particle Density
| Aspect | Detail |
|--------|--------|
| **What** | Automatically adjust particle count based on device performance to maintain target FPS |
| **Value proposition** | Prevents the app from being unusable on weaker hardware. Graceful degradation instead of slideshow. |
| **Complexity** | Medium |
| **Confidence** | HIGH (standard adaptive quality pattern) |
| **Notes** | Monitor FPS over a rolling window. If below threshold, reduce particle count, simplify shaders, reduce ML inference frequency. If above threshold with headroom, increase quality. This should be invisible to the user. Start conservative, ramp up. |
| **Dependencies** | TS-4 (particle system), TS-11 (performance monitoring) |

### D-9: Keyboard Shortcut to Cycle Visualizations / Themes
| Aspect | Detail |
|--------|--------|
| **What** | Allow switching between different particle visual themes (e.g., "nebula", "fireflies", "ink in water") |
| **Value proposition** | Adds replay value and showcases technical range. Different themes for different portfolio presentations. |
| **Complexity** | Medium (per theme, once the system is parameterized) |
| **Confidence** | HIGH |
| **Notes** | If the particle system is properly parameterized (D-1), adding themes is just swapping configuration presets: color palettes, particle textures, movement algorithms, blending modes. Start with one polished theme. Add more as stretch goals. |
| **Dependencies** | D-1 (parameterized particle aesthetics), TS-5 (emotion mapping as config) |

---

## Anti-Features

Features to deliberately NOT build. These are common mistakes in similar projects that waste time, hurt performance, or degrade the experience.

### AF-1: Multiple Face Detection
| Anti-feature | Detail |
|--------------|--------|
| **What** | Detecting and rendering auras for multiple people simultaneously |
| **Why avoid** | Doubles ML inference cost, massively complicates gesture attribution (whose hand is whose?), and the "aura" concept is personal/individual. Multi-face turns a focused experience into a confusing one. |
| **What to do instead** | Detect only the largest/closest face. If multiple faces detected, use the primary one and ignore others. State "designed for single-user experience" in the UI. |
| **Confirmed out of scope** | Yes (PROJECT.md) |

### AF-2: Audio/Sound Effects
| Anti-feature | Detail |
|--------------|--------|
| **What** | Adding ambient music or sound effects that react to emotions |
| **Why avoid** | Scope creep. Audio synthesis/selection is an entire domain. Autoplay audio is hostile UX. Users often have other audio playing. Adds no value to the core visual demo. |
| **What to do instead** | Keep purely visual. If ever added post-v1, make it opt-in with a mute-by-default toggle. |
| **Confirmed out of scope** | Yes (PROJECT.md) |

### AF-3: Video Recording/Export
| Anti-feature | Detail |
|--------------|--------|
| **What** | Recording the experience as a video file or GIF for sharing |
| **Why avoid** | `MediaRecorder` API for canvas capture is complex, browser-inconsistent, and creates large files. Encoding is CPU-intensive and will tank FPS during recording. The sharing use case is better served by screenshots. |
| **What to do instead** | If sharing is desired later, a single screenshot/snapshot feature is 10x simpler and sufficient for social sharing. |
| **Confirmed out of scope** | Yes (PROJECT.md) |

### AF-4: User Accounts / Persistence
| Anti-feature | Detail |
|--------------|--------|
| **What** | Login, saving preferences, session history |
| **Why avoid** | Adds backend requirements to a client-side-only project. Adds GDPR/privacy concerns for camera data. The experience is ephemeral by design -- you open it, play with it, close it. |
| **What to do instead** | Use `localStorage` for simple preferences (theme choice, debug toggle state) if needed. No accounts. |
| **Confirmed out of scope** | Yes (PROJECT.md) |

### AF-5: Mobile Support (v1)
| Anti-feature | Detail |
|--------------|--------|
| **What** | Optimizing for mobile browsers and touch interaction |
| **Why avoid** | Mobile WebGL performance is dramatically worse. Mobile front cameras have different characteristics. Touch gestures conflict with hand-gesture-in-camera interaction model. Responsive layout for the particle canvas is non-trivial. This doubles the QA surface for minimal portfolio value (portfolio reviewers use desktops). |
| **What to do instead** | Show a clean "best experienced on desktop" message on mobile. Don't break, just don't optimize. |
| **Confirmed out of scope** | Yes (PROJECT.md) |

### AF-6: Complex UI Controls / Settings Panels
| Anti-feature | Detail |
|--------------|--------|
| **What** | Sliders for particle count, color pickers, emotion sensitivity controls, model selection dropdowns |
| **Why avoid** | Turns a polished demo into a science experiment UI. Portfolio visitors want to experience something beautiful, not configure it. Every control is a decision the user has to make, which slows the "wow" moment. Configuration UI is boring to build and boring to use. |
| **What to do instead** | Tune defaults to be great out of the box. Hide any developer controls behind the debug overlay (D-7). The experience should "just work" when you open it. |

### AF-7: Emotion History / Analytics Dashboard
| Anti-feature | Detail |
|--------------|--------|
| **What** | Graphs showing emotion over time, "mood report", analytics of user's emotional state |
| **Why avoid** | Shifts the product from "artistic experience" to "surveillance tool." Users feel watched rather than delighted. Privacy-invasive framing. Also adds significant UI complexity for a feature that fights the core concept. |
| **What to do instead** | The real-time particle visualization IS the emotion feedback. It's artistic, not analytical. |

### AF-8: Custom Gesture Training
| Anti-feature | Detail |
|--------------|--------|
| **What** | Let users define their own gestures and map them to particle effects |
| **Why avoid** | Massive complexity (gesture recording, classification training, UI for mapping). The three gestures (push/attract/concentrate) are sufficient and intuitive. More gestures = more confusion about what to do. |
| **What to do instead** | Hardcode three well-tuned gestures. Make them feel great. Quality over quantity. |

### AF-9: Webcam Feed Always Visible at Full Size
| Anti-feature | Detail |
|--------------|--------|
| **What** | Showing the raw webcam feed prominently alongside or behind the particle system |
| **Why avoid** | Most users dislike seeing their unfiltered face on screen. It makes the experience feel like a video call, not an art piece. The webcam feed is functional input, not the output. |
| **What to do instead** | Either: (A) Show a small, semi-transparent, or stylized version of the webcam feed in a corner. (B) Overlay particles directly on top of a darkened/blurred webcam feed. (C) Hide the feed entirely and just show particles. Option B is recommended -- it connects the aura to the person without being unflattering. |

### AF-10: Server-Side ML Processing
| Anti-feature | Detail |
|--------------|--------|
| **What** | Sending webcam frames to a server for ML inference |
| **Why avoid** | Adds latency (network round-trip kills "real-time"), requires backend infrastructure, creates privacy concerns (camera data leaving the device), and costs money to host. Client-side inference with MediaPipe is fast enough. |
| **What to do instead** | All ML runs in-browser. This is both a technical constraint and a feature ("your camera data never leaves your device"). |
| **Confirmed out of scope** | Yes (PROJECT.md) |

---

## Feature Dependencies

```
TS-1 (Webcam)
  |
  +---> TS-2 (Face Detection)
  |       |
  |       +---> TS-3 (Emotion Classification)
  |               |
  |               +---> TS-5 (Emotion-to-Particle Mapping)
  |               |       |
  |               |       +---> TS-6 (Smooth Transitions)
  |               |
  |               +---> D-3 (Emotion Intensity Scaling)
  |               +---> D-6 (Onboarding Calibration)
  |
  +---> TS-7 (Hand Detection)
          |
          +---> TS-8 (Gesture Recognition)
                  |
                  +---> TS-9 (Gesture-to-Particle Interaction)
                  +---> D-4 (Visual Gesture Feedback)

TS-4 (Particle System) [independent foundation]
  |
  +---> TS-5 (Emotion-to-Particle Mapping)
  +---> TS-9 (Gesture-to-Particle Interaction)
  +---> D-1 (Organic Aesthetics)
  +---> D-2 (Face-Anchored Spawning)
  +---> D-8 (Responsive Particle Density)
  +---> D-9 (Theme Cycling)

TS-10 (Error Handling) [independent]
  +---> D-5 (Loading Experience)

TS-11 (Performance) [cross-cutting]
  +---> D-7 (Debug Overlay)
  +---> D-8 (Responsive Density)
```

### Critical Path

The longest dependency chain that determines minimum time to a working demo:

```
Webcam --> Face Detection --> Emotion Classification --> Emotion Mapping --> Smooth Transitions
                                                              |
Particle System (can develop in parallel) --------------------+
```

Hand gestures are a parallel track that can be developed independently and integrated later:

```
Webcam --> Hand Detection --> Gesture Recognition --> Gesture-Particle Interaction
```

---

## MVP Recommendation

For the minimum viable demo that already feels impressive:

### Must Have (Phase 1 -- "It works and looks good")
1. **TS-1** Webcam access with permission handling
2. **TS-2** Face detection via MediaPipe
3. **TS-3** Emotion classification from blendshapes
4. **TS-4** GPU-accelerated particle system
5. **TS-5** Emotion-to-particle mapping (all 5 emotions)
6. **TS-6** Smooth transitions between emotion states
7. **TS-10** Error/loading handling
8. **D-1** Organic/fluid aesthetics (this is what makes it portfolio-worthy)
9. **D-2** Face-anchored particle spawning

### Add Next (Phase 2 -- "Interaction")
10. **TS-7** Hand landmark detection
11. **TS-8** Gesture recognition
12. **TS-9** Gesture-particle interaction
13. **D-4** Visual gesture feedback
14. **D-3** Emotion intensity scaling
15. **D-6** Onboarding moment

### Polish (Phase 3 -- "Portfolio-ready")
16. **D-5** Polished loading experience
17. **D-7** Debug overlay
18. **D-8** Responsive particle density
19. **TS-11** Performance optimization pass
20. **D-9** Theme cycling (stretch)

### Defer Indefinitely
- All anti-features (AF-1 through AF-10)

---

## Rationale for Ordering

**Phase 1 first** because the emotion-to-particle pipeline is the core product. A user should be able to open the app, see their face detected, and watch beautiful particles react to their smile. This alone is demo-worthy.

**Phase 2 second** because gesture interaction is the second "wow" layer but depends on the particle system already working well. Running two ML models simultaneously is the hardest performance challenge, so it should come after the base is stable.

**Phase 3 last** because polish features like loading screens, debug tools, and adaptive quality are important for the final product but don't change the core experience. These are finishing touches.

**D-1 (organic aesthetics) is in Phase 1, not Phase 3**, because this is not a nice-to-have. The visual quality of the particles IS the product. Default WebGL points look terrible. Investing in shader-based soft particles early means every subsequent feature benefits from the visual quality. A technically impressive but ugly demo is not portfolio-worthy.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Webcam/permissions (TS-1) | HIGH | Standard browser APIs, well-documented |
| MediaPipe face capabilities (TS-2, TS-3) | MEDIUM | Blendshape-based emotion classification is sound in principle, but tuning thresholds for reliable emotion detection from blendshapes needs empirical testing. Verify blendshape list and behavior against current MediaPipe docs. |
| Particle system (TS-4, D-1) | HIGH | Three.js particle systems are thoroughly documented and well-understood |
| MediaPipe hand capabilities (TS-7, TS-8) | MEDIUM | Hand landmarks are well-supported, but running face + hand simultaneously at 30+ FPS in browser needs performance validation. Pinch gesture detection from landmarks needs empirical threshold tuning. |
| Dual-model performance (TS-11) | LOW-MEDIUM | Running both Face Landmarker and Hand Landmarker simultaneously is the biggest technical risk. May require inference staggering, model downscaling, or resolution reduction. Needs early prototyping. |
| Gesture physics (TS-9) | HIGH | Force-based particle interaction is straightforward physics simulation |
| Feature prioritization | HIGH | Based on analysis of similar projects and portfolio demo best practices |

## Sources

- Training knowledge of MediaPipe Face Landmarker (face mesh, blendshapes) -- MEDIUM confidence, verify current API
- Training knowledge of MediaPipe Hand Landmarker (21 landmarks per hand) -- MEDIUM confidence, verify current API
- Training knowledge of Three.js particle systems (BufferGeometry, Points, custom shaders) -- HIGH confidence
- Training knowledge of `getUserMedia` browser API -- HIGH confidence
- Training knowledge of WebGL rendering patterns -- HIGH confidence
- Note: WebSearch and WebFetch were unavailable during this research session. All claims are based on training data. MediaPipe-specific claims (blendshape names, gesture recognizer capabilities, model sizes) should be verified against current official documentation before implementation.
