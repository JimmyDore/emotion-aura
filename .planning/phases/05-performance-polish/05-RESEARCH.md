# Phase 5: Performance & Polish - Research

**Researched:** 2026-02-07
**Domain:** WebGL performance optimization, cross-browser compatibility, neon particle aesthetics, fullscreen UI polish
**Confidence:** HIGH (codebase analysis + verified web references)

## Summary

This phase transforms the already-functional Emotion Aura application into a portfolio-ready experience. The research covers five interconnected domains: (1) particle visual overhaul from dot-like to neon energy sparks with tight bright cores and medium glow halos, (2) fixing the dark webcam feed with CSS brightness/contrast filters, (3) moving particle spawn from ear landmarks to a head outline halo using MediaPipe's FACE_OVAL landmarks, (4) cross-browser compatibility for Chrome/Firefox/Safari, and (5) fullscreen immersive layout with toggleable overlays and branding.

The existing codebase is well-architected. The fragment shader already has a two-term exponential glow (`exp(-dist * 6.0) * 0.8 + exp(-dist * 2.0) * 0.2`) that can be tuned for the neon spark aesthetic. The particle pool, staggered inference, and quality scaler are all in place. The main work is parameter tuning, shader refinement, spawn point migration, and UI layer additions. Full-screen bloom post-processing (EffectComposer + UnrealBloomPass) is NOT recommended -- the per-particle additive blending approach already in place is cheaper and achieves the neon look with shader tuning alone.

**Primary recommendation:** Tune the existing fragment shader for tighter core + wider halo, fix webcam brightness via CSS `filter: brightness() contrast()`, migrate spawn points to FACE_OVAL landmarks, and add minimal UI (stats toggle, overlay toggle, branding) as DOM overlays.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.182.0 | WebGL renderer, ShaderMaterial, Points | Already in use, no upgrade needed |
| @mediapipe/tasks-vision | 0.10.32 | Face/hand detection, 478-point face mesh | Already in use, FACE_OVAL landmarks available |
| stats.js | 0.17.0 | FPS/MS/MB performance monitoring | Already in use, needs toggle UI wrapper |
| vite | 7.2.4+ | Build tool, dev server | Already in use |
| vite-plugin-glsl | 1.5.5 | GLSL shader imports | Already in use |

### Supporting (No New Dependencies)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| CSS `filter: brightness() contrast()` | Brighten dark webcam feed | Applied to `#webcam` video element |
| `gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)` | Detect max point size per browser | Runtime check for Safari gl_PointSize cap |
| Feature detection via try/catch | Safari WebGL compatibility | Graceful fallback for unsupported features |

### No New Dependencies Needed
This phase requires zero new npm packages. All work is shader tuning, CSS adjustments, landmark index changes, and DOM overlay additions.

**Installation:** None required.

## Architecture Patterns

### Current Project Structure (Relevant Files)
```
src/
  particles/
    shaders/
      particle.vert.glsl    # Vertex shader (noise displacement, point size)
      particle.frag.glsl    # Fragment shader (glow falloff, fade) -- MODIFY
      noise3d.glsl           # Simplex noise (keep as-is)
    ParticleSystem.ts        # GPU buffer management -- MINOR MODIFY
    ParticlePool.ts          # Ring buffer pool -- NO CHANGE
    FaceLandmarkTracker.ts   # Ear-based spawn points -- MAJOR MODIFY (head outline)
    EmotionProfile.ts        # Color palettes, motion profiles -- TUNE
    QualityScaler.ts         # Adaptive quality -- MODIFY (remove visible indicator)
  scene/
    SceneManager.ts          # WebGL renderer setup -- MINOR MODIFY (antialias toggle)
  ui/
    EmotionOverlay.ts        # Emotion HUD -- MODIFY (toggleable)
    GestureOverlay.ts        # Gesture HUD -- MODIFY (toggleable)
  style.css                  # All styles -- MODIFY (webcam brightness, fullscreen, toggle buttons)
  core/
    constants.ts             # All tunable parameters -- MODIFY
  main.ts                    # Orchestration -- MODIFY (toggle logic, branding, spawn changes)
```

### Pattern 1: Neon Spark Shader (Per-Particle, No Post-Processing)
**What:** Achieve neon energy spark look entirely within the fragment shader using additive blending (already enabled) and tuned exponential falloff. No EffectComposer or UnrealBloomPass needed.
**When to use:** Always -- full-screen bloom post-processing would add a render pass costing ~2-4ms, unacceptable when ML inference already takes ~8-12ms.
**Key insight:** With `THREE.AdditiveBlending` already set, overlapping particles naturally create bloom-like accumulation. The fragment shader just needs tighter core brightness and wider halo reach.
**Example:**
```glsl
// Neon spark: tight bright core + medium glow halo
// Source: Tuned from existing shader + LearnOpenGL bloom concepts
float dist = length(gl_PointCoord - vec2(0.5));
if (dist > 0.5) discard;

// Three-term falloff: sharp core, medium halo, soft outer
float core = exp(-dist * 12.0);          // tight bright center
float halo = exp(-dist * 4.0) * 0.5;     // medium glow spread
float outer = exp(-dist * 1.5) * 0.15;   // subtle outer reach
float glow = core + halo + outer;

// Fade in/out based on lifetime
float fade = smoothstep(0.0, 0.1, vLife) * smoothstep(1.0, 0.8, vLife);

// Boost core brightness for neon intensity (values > 1.0 are fine with additive blending)
gl_FragColor = vec4(vColor * glow * 1.3, glow * fade);
```

### Pattern 2: Head Outline Spawn (FACE_OVAL Landmarks)
**What:** Migrate particle spawn from two ear landmarks (234, 454) to the full FACE_OVAL contour for a halo/aura emanating outward.
**When to use:** Replacing the current ear-based spawning.
**Key data:** The 36 FACE_OVAL landmark indices define the face outline perimeter:
```typescript
// Source: MediaPipe face_mesh_connections.py FACEMESH_FACE_OVAL
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
  361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
];
```
**Spawn strategy:** Each frame, pick a random FACE_OVAL landmark as the spawn origin. Compute outward direction from face center through that point. Apply the usual spread/speed from the emotion profile. This naturally creates an even halo around the head.

### Pattern 3: Webcam Brightness Fix (CSS Filter)
**What:** Fix the dark webcam feed by changing the CSS `filter` property from `brightness(0.3)` to a higher value.
**When to use:** Immediately -- current `filter: brightness(0.3)` makes the face nearly invisible.
**Key insight:** CSS filters on video elements are GPU-accelerated, zero-cost compared to canvas-based alternatives. The brightness needs to go up significantly (0.3 is 30% brightness, making everything very dark).
**Example:**
```css
/* Source: MDN CSS filter documentation */
#webcam {
  filter: brightness(0.85) contrast(1.1);
  /* 0.85 = slightly dimmed for particle contrast */
  /* contrast(1.1) = slightly boosted to offset the brightness increase */
}
```

### Pattern 4: Silent Quality Degradation
**What:** Remove the visible "Quality: reduced" indicator. Quality scaling operates silently per user decision.
**When to use:** Always -- the QualityScaler.ts currently creates a DOM indicator that should be removed.
**Implementation:** Remove `createIndicator()`, `updateIndicator()`, and the `.quality-indicator` CSS class. The scaling logic itself (reduce particles first, keep ML intact) remains unchanged.

### Pattern 5: Toggleable UI Overlays
**What:** Wrap stats.js, emotion overlay, and gesture overlay in toggle-able containers controlled by a small button.
**When to use:** For the fullscreen immersive layout.
**Implementation:** A single "hamburger-style" or icon toggle button (bottom-right corner, semi-transparent) that shows/hides all info overlays. Stats button separately (bottom-left). Both use CSS transitions for smooth show/hide.

### Anti-Patterns to Avoid
- **Full-screen bloom post-processing:** EffectComposer + UnrealBloomPass adds a full-screen render pass (bright extraction + blur + composite). At 2-4ms per frame on a scene already budget-constrained by ML inference, this is too expensive. The per-particle additive approach achieves 90% of the visual effect at zero extra cost.
- **Canvas-based webcam brightness:** Drawing video to canvas, manipulating pixels, then displaying is vastly more expensive than CSS `filter: brightness()`. CSS filters are composited by the browser's GPU layer.
- **Spawning from all 36 FACE_OVAL points every frame:** Only sample a subset (or random pick) per spawn event. Smoothing all 36 each frame adds unnecessary computation.
- **Removing antialias entirely:** While `antialias: false` saves some GPU, it makes the particle edges noticeably jagged. Keep it on for visual quality since the particle shader already does its own edge softening.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FPS monitoring | Custom FPS counter | stats.js (already installed) | Handles rolling averages, memory tracking, panel toggling |
| Face outline landmarks | Manual landmark selection | FACE_OVAL indices from MediaPipe | 36 validated indices from official face mesh connections |
| Webcam brightness | Canvas pixel manipulation | CSS `filter: brightness()` | GPU-accelerated, zero JS cost, cross-browser |
| Adaptive quality | Custom FPS-based scaling | QualityScaler (already built) | Already implements hysteresis, rolling window, pool capping |
| Glow/bloom effect | EffectComposer post-processing | Per-particle shader glow + additive blending | Zero extra render passes, already implemented |

**Key insight:** This phase is primarily about tuning existing systems, not building new ones. The architecture from phases 1-4 was designed for this -- the constants, shader uniforms, and quality scaler are all the extension points needed.

## Common Pitfalls

### Pitfall 1: gl_PointSize Browser Limits
**What goes wrong:** Safari and some GPUs cap `gl_PointSize` at 63px or less. Particles designed at 35px base * 1.5 multiplier * 2.0 pixelRatio = 105px would silently clamp, making particles smaller than intended.
**Why it happens:** WebGL spec allows implementations to limit point size. The actual limit varies by GPU/driver.
**How to avoid:** Query `gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)` at init time and cap `PARTICLE_SIZE_BASE` accordingly. Log the detected limit. If the max is < 64, reduce base size and compensate with wider glow halo in the shader.
**Warning signs:** Particles look identical across different base sizes (clamped at max).

### Pitfall 2: Safari WebGL Context Loss
**What goes wrong:** Safari on macOS (especially M-series) can lose the WebGL context under heavy GPU load when running both MediaPipe (GPU delegate) and Three.js rendering simultaneously.
**Why it happens:** Safari's WebGL implementation has tighter resource limits. Two GPU consumers (MediaPipe WASM+GPU, Three.js WebGL) compete for GPU memory.
**How to avoid:** Handle the `webglcontextlost` event on the canvas. Consider falling back MediaPipe to CPU delegate (`delegate: 'CPU'`) on Safari if context loss occurs. Test with Safari's Web Inspector GPU timeline.
**Warning signs:** Black canvas, console errors about lost context, Three.js rendering stops.

### Pitfall 3: Webcam Brightness Overcorrection
**What goes wrong:** Setting `brightness(1.0)` or higher makes the webcam too bright, washing out particles that rely on additive blending contrast against a dark background.
**Why it happens:** Additive blending adds particle color on top of whatever is behind. Brighter backgrounds reduce perceived particle glow.
**How to avoid:** Target brightness(0.7-0.9) range -- bright enough to clearly see the face, dim enough that neon sparks pop. Test with actual webcam in different lighting conditions. The contrast filter helps: `contrast(1.1)` deepens darks while keeping face visible.
**Warning signs:** Particles look washed out, blend into the webcam background.

### Pitfall 4: FACE_OVAL Landmark Jitter
**What goes wrong:** The face oval landmarks (especially jaw/chin area) have more jitter than the ear/nose landmarks currently used, causing spawn positions to wobble.
**Why it happens:** MediaPipe's jaw landmarks are less stable than eye/nose area landmarks.
**How to avoid:** Apply EMA smoothing to the averaged oval center and individual spawn points, similar to the existing FaceLandmarkTracker. Use a subset of the more stable landmarks (forehead: 10, 338, 297; temples: 234, 454; jaw midpoints: 152, 377, 400) for smoother results.
**Warning signs:** Particles appear to "shake" at their spawn origins.

### Pitfall 5: Safari backdrop-filter Issues
**What goes wrong:** The glassmorphic overlays (emotion/gesture panels) using `backdrop-filter: blur()` can render incorrectly in Safari 18+ when nested or combined with other filters.
**Why it happens:** Safari has known rendering bugs with backdrop-filter when elements are layered.
**How to avoid:** Always include both `backdrop-filter` and `-webkit-backdrop-filter`. Test with Safari. If issues persist, fall back to solid semi-transparent backgrounds (`rgba(0,0,0,0.7)`) instead of blur.
**Warning signs:** Overlays appear fully opaque, blur not visible, or visual artifacts in Safari.

### Pitfall 6: Stats.js Positioning Conflicts
**What goes wrong:** stats.js hardcodes `position: absolute` on its DOM element. In a fullscreen layout, it may overlap with other UI elements or not respect the intended placement.
**Why it happens:** stats.js creates its own styled DOM element that doesn't integrate with app CSS.
**How to avoid:** After appending stats.dom, override its positioning: `stats.dom.style.position = 'fixed'`. Wrap it in a container div for toggle control. Set explicit z-index above the canvas but below modal overlays.
**Warning signs:** Stats panel hidden behind other elements or in wrong position.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Neon Spark Fragment Shader (Tuned)
```glsl
// Enhanced fragment shader for neon energy sparks
// Source: Tuned from existing particle.frag.glsl + additive blending principles
varying vec3 vColor;
varying float vLife;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  // Three-term exponential: sharp core + medium halo + soft outer glow
  float core  = exp(-dist * 12.0);          // bright center spark
  float halo  = exp(-dist * 4.0) * 0.5;     // energy halo
  float outer = exp(-dist * 1.5) * 0.15;    // subtle atmospheric glow
  float glow = core + halo + outer;

  // Quick fade-in, slower fade-out for spark trail feel
  float fade = smoothstep(0.0, 0.08, vLife) * smoothstep(1.0, 0.75, vLife);

  // Color boost: neon sparks should be overbright at core
  // Additive blending handles values > 1.0 gracefully
  gl_FragColor = vec4(vColor * glow * 1.4, glow * fade);
}
```

### Head Outline Spawn Points
```typescript
// Source: MediaPipe FACEMESH_FACE_OVAL + codebase FaceLandmarkTracker pattern
// 36 landmark indices forming the face oval contour
const FACE_OVAL_INDICES: readonly number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
  361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
] as const;

// Pick random spawn point on face oval
function getRandomOvalSpawnPoint(
  landmarks: NormalizedLandmark[],
  aspect: number,
): { x: number; y: number } | null {
  const idx = FACE_OVAL_INDICES[
    Math.floor(Math.random() * FACE_OVAL_INDICES.length)
  ];
  const lm = landmarks[idx];
  if (!lm) return null;
  return {
    x: -(lm.x * 2 - 1) * aspect,  // mirror for webcam
    y: -(lm.y * 2 - 1),
  };
}
```

### Webcam Brightness CSS Fix
```css
/* Source: MDN CSS filter / codebase style.css */
#webcam {
  /* BEFORE: filter: brightness(0.3); -- way too dark */
  /* AFTER: face clearly visible, particles still pop on dimmed background */
  filter: brightness(0.8) contrast(1.1) saturate(1.05);
}
```

### Toggle Button UI Pattern
```typescript
// Source: Codebase pattern (DOM creation like EmotionOverlay/GestureOverlay)
function createToggleButton(
  label: string,
  position: { bottom: string; right?: string; left?: string },
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'toggle-btn';
  btn.textContent = label;
  btn.style.position = 'fixed';
  btn.style.bottom = position.bottom;
  if (position.right) btn.style.right = position.right;
  if (position.left) btn.style.left = position.left;
  btn.style.zIndex = '100';
  btn.addEventListener('click', onClick);
  document.body.appendChild(btn);
  return btn;
}
```

### Toggle Button CSS
```css
/* Minimal, semi-transparent toggle fitting fullscreen immersive aesthetic */
.toggle-btn {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: color 0.2s ease, background 0.2s ease;
  pointer-events: auto;
}

.toggle-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.6);
}
```

### Branding Overlay
```typescript
// "Emotion Aura" title + jimmydore.fr link
function createBranding(container: HTMLElement): HTMLDivElement {
  const branding = document.createElement('div');
  branding.className = 'branding';
  branding.innerHTML = `
    <span class="branding__title">Emotion Aura</span>
    <a class="branding__link" href="https://jimmydore.fr"
       target="_blank" rel="noopener">jimmydore.fr</a>
  `;
  container.appendChild(branding);
  return branding;
}
```

### gl_PointSize Safety Check
```typescript
// Source: WebGL spec + webglfundamentals.org
function getMaxPointSize(renderer: THREE.WebGLRenderer): number {
  const gl = renderer.getContext();
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  return range ? range[1] : 64; // fallback to conservative 64
}
```

### WebGL Context Loss Handler
```typescript
// Source: WebGL spec / Three.js best practices
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault(); // Allows context restoration
  cancelAnimationFrame(rafId);
  console.warn('WebGL context lost -- pausing render loop');
});

canvas.addEventListener('webglcontextrestored', () => {
  console.info('WebGL context restored -- resuming');
  // Re-init renderer state, restart loop
  animate();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-screen bloom post-processing | Per-particle shader glow + additive blending | Always preferred for point sprites | Saves 2-4ms/frame by avoiding extra render passes |
| Canvas pixel manipulation for brightness | CSS `filter: brightness()` on video element | CSS Filters widely supported since ~2018 | GPU-composited, zero JS cost |
| Fixed particle count | Adaptive QualityScaler (already built) | Phase 3 of this project | Handles varying hardware automatically |
| Single ear spawn points | FACE_OVAL contour (36 landmarks) | This phase | Natural aura/halo appearance |

**Deprecated/outdated:**
- `THREE.EffectComposer` from `three/examples/jsm/postprocessing/` is being superseded by `three/examples/jsm/tsr/` and WebGPU approaches, but neither is needed here since per-particle glow suffices.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact brightness/contrast values for webcam**
   - What we know: Current `brightness(0.3)` is far too dark. Target range is 0.7-0.9.
   - What's unclear: Optimal values depend on ambient lighting conditions and webcam quality. Different webcams output different base brightness.
   - Recommendation: Start with `brightness(0.8) contrast(1.1)`, tune during development with real webcam. These are CSS values, trivially adjustable.

2. **Safari GPU delegate reliability**
   - What we know: MediaPipe detectors use `delegate: 'GPU'`. Chrome handles this well. Safari has had WebGL context issues on M-series Macs.
   - What's unclear: Whether the current @mediapipe/tasks-vision@0.10.32 version handles Safari GPU delegation gracefully, or whether it causes context loss when combined with Three.js.
   - Recommendation: Test on Safari early. If context loss occurs, add a Safari detection path that uses `delegate: 'CPU'` for MediaPipe. Performance will be lower but stable.

3. **Optimal FPS target**
   - What we know: Current QUALITY_FPS_THRESHOLD is 30. The camera runs at 30fps max. Staggered inference means each ML model runs at 15fps.
   - What's unclear: Whether targeting 30fps is sufficient for perceived smoothness of particle motion, or whether 45-60fps render loop with 15fps inference is noticeably better.
   - Recommendation: Keep 30fps as the quality threshold (matching camera framerate). The render loop already runs as fast as possible via requestAnimationFrame -- particles interpolate smoothly between inference frames. The 30fps threshold is correct as the floor.

4. **Color mixing when neutral dominates**
   - What we know: User wants reduced neutral blending when a strong emotion is detected. Current blend uses linear weighted sum of all emotion scores.
   - What's unclear: Best approach -- suppress neutral score, boost dominant, or use non-linear blending.
   - Recommendation: Increase NEUTRAL_SUPPRESSION_FACTOR from 2.5 to 3.0-3.5, making neutral less dominant. This is a single constant change. Test with real expressions.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All 23 TypeScript files + 3 GLSL shaders + style.css + index.html read in full
- MediaPipe FACEMESH_FACE_OVAL: [face_mesh_connections.py](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py) -- 36 face outline landmark indices verified
- MDN CSS filter: [filter documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) -- brightness(), contrast() GPU-accelerated
- WebGL gl_PointSize limits: [webglfundamentals.org](https://webglfundamentals.org/webgl/lessons/webgl-qna-working-around-gl_pointsize-limitations-webgl.html) -- hardware-dependent, max ~63px on some GPUs
- stats.js API: [GitHub README](https://github.com/mrdoob/stats.js/) -- showPanel(), dom property, begin()/end()

### Secondary (MEDIUM confidence)
- LearnOpenGL Bloom: [learnopengl.com/Advanced-Lighting/Bloom](https://learnopengl.com/Advanced-Lighting/Bloom) -- bloom technique description, confirms per-particle approach is cheaper
- Three.js performance tips: [Codrops article](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) -- general optimization patterns
- Safari backdrop-filter issues: [Graffino TIL](https://graffino.com/til/how-to-fix-filter-blur-performance-issue-in-safari) -- -webkit- prefix required, known rendering bugs
- Three.js Safari issues: [GitHub #30767](https://github.com/mrdoob/three.js/issues/30767) -- M3/M4 WebGL context issues

### Tertiary (LOW confidence)
- Safari MediaPipe GPU delegate behavior: No direct documentation found for @0.10.32 + Safari desktop combo. Needs runtime testing.
- Exact neon spark shader parameters: Values in code examples are informed estimates from glow math -- will need visual tuning.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- already installed, no new dependencies, versions verified from package.json
- Architecture patterns: HIGH -- based on full codebase read, shader math fundamentals, verified MediaPipe landmarks
- Webcam brightness: HIGH -- CSS filter is simple and well-documented, just needs value tuning
- Head outline spawn: HIGH -- FACE_OVAL indices verified from official MediaPipe source
- Neon shader parameters: MEDIUM -- math is sound but exact values need visual tuning
- Cross-browser (Chrome/Firefox): HIGH -- standard WebGL, no known issues
- Cross-browser (Safari): MEDIUM -- known potential issues, needs runtime testing
- UI/Layout: HIGH -- standard DOM manipulation following existing codebase patterns

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days -- stable stack, no version upgrades planned)
