# Phase 3: Particle System - Research

**Researched:** 2026-02-06
**Domain:** GPU particle rendering with Three.js, custom GLSL shaders, emotion-driven visual effects
**Confidence:** HIGH

## Summary

This phase requires building a GPU-driven particle system using Three.js 0.182.0 (already installed) that renders ethereal, glowing particles spawning from the user's face and morphing behavior based on detected emotion. The research covers the core rendering approach (THREE.Points + custom ShaderMaterial), GLSL techniques for soft glow/trails, coordinate mapping from MediaPipe face landmarks to the orthographic scene, emotion-to-visual-profile mapping, and adaptive quality scaling.

The standard approach for this type of system is: pre-allocate a fixed-size `BufferGeometry` with custom attributes (position, velocity, color, size, life, etc.), render via `THREE.Points` with a custom `ShaderMaterial` using additive blending, animate particles primarily on the CPU for this particle count range (500-2000), and use `needsUpdate = true` to push changes to the GPU each frame. Optional post-processing with `UnrealBloomPass` via `EffectComposer` can enhance the glow effect. For organic motion, embed a simplex noise function directly in the GLSL vertex shader.

**Primary recommendation:** Use THREE.Points with a custom ShaderMaterial (additive blending, no depth write), pre-allocated ring-buffer BufferGeometry (~1500 max particles), CPU-side particle simulation with per-frame attribute updates, simplex noise in GLSL for organic motion, and optional UnrealBloomPass for enhanced glow.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.182.0 | Scene, renderer, Points, ShaderMaterial, BufferGeometry | Already installed. Provides all needed rendering primitives |
| GLSL (inline) | ES 3.0 / WebGL2 | Custom vertex + fragment shaders for particle appearance | Required for soft glow, radial falloff, and per-particle animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-glsl | ^1.5.1 | Import .glsl/.vert/.frag files as modules with #include support | For organizing shaders in separate files instead of template literals |
| three/addons EffectComposer + UnrealBloomPass | (bundled with three 0.182.0) | Post-processing bloom for enhanced glow | If fragment-shader-only glow is insufficient for the ethereal aesthetic |
| stats.js | 0.17.0 | FPS monitoring for quality scaling trigger | Already installed. Used to detect FPS drops below 30 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CPU particle sim | GPGPU (GPUComputationRenderer) | GPGPU is faster for 10k+ particles but adds complexity; 500-2000 particles are well within CPU budget |
| vite-plugin-glsl | Vite `?raw` imports | ?raw works without a plugin but lacks #include for shader chunks; plugin is cleaner for multi-file shaders |
| UnrealBloomPass | Fragment-shader-only glow | Bloom pass adds a full-screen post-processing pipeline; shader-only glow is cheaper but less dramatic. Start with shader-only, add bloom if needed |
| Custom particle engine | three.quarks | three.quarks is a full VFX engine but adds a heavy dependency for a use case that custom ShaderMaterial handles well |

**Installation:**
```bash
npm install -D vite-plugin-glsl
```

No other new dependencies required. Three.js 0.182.0 and stats.js are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  particles/
    ParticleSystem.ts       # Main system: init, update, dispose
    ParticlePool.ts         # Ring-buffer pool: spawn, recycle, age particles
    EmotionProfile.ts       # Per-emotion config: colors, speed, direction, size
    QualityScaler.ts        # FPS monitoring + adaptive particle count
    shaders/
      particle.vert.glsl    # Vertex shader: position, size, noise displacement
      particle.frag.glsl    # Fragment shader: soft glow radial falloff, color
      noise3d.glsl          # Simplex noise 3D (Ashima/stegu, MIT licensed)
    FaceLandmarkTracker.ts  # Extract face center from MediaPipe landmarks
```

### Pattern 1: Pre-allocated Ring-Buffer Pool
**What:** Allocate a fixed-size Float32Array for the maximum particle count at init time. Use a cursor-based ring buffer to spawn new particles by overwriting the oldest. Use `BufferGeometry.setDrawRange()` to control how many particles are actually drawn.
**When to use:** Always. This avoids array resizing and garbage collection during the render loop.
**Example:**
```typescript
// Source: Three.js official docs + community best practice
const MAX_PARTICLES = 1500;
const positions = new Float32Array(MAX_PARTICLES * 3);
const colors = new Float32Array(MAX_PARTICLES * 3);
const sizes = new Float32Array(MAX_PARTICLES);
const lifetimes = new Float32Array(MAX_PARTICLES);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1).setUsage(THREE.DynamicDrawUsage));

// Draw only active particles
geometry.setDrawRange(0, activeCount);
```

### Pattern 2: Custom ShaderMaterial with Additive Blending
**What:** Use THREE.ShaderMaterial with AdditiveBlending, no depth write, and transparent:true. The vertex shader sets gl_PointSize and passes per-particle data to the fragment shader. The fragment shader creates soft circular glow using radial distance from gl_PointCoord.
**When to use:** Always for this type of ethereal particle effect.
**Example:**
```typescript
// Source: Three.js official example webgl_buffergeometry_custom_attributes_particles
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSpawnCenter: { value: new THREE.Vector2(0, 0) }, // face position
    uEmotionColor: { value: new THREE.Color(1.0, 0.85, 0.4) },
    uIntensity: { value: 0.5 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: vertexShaderSource,
  fragmentShader: fragmentShaderSource,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
  transparent: true,
});

const points = new THREE.Points(geometry, material);
scene.add(points);
```

### Pattern 3: Face Landmark to Scene Coordinate Mapping
**What:** MediaPipe FaceLandmarker returns 478 landmarks with x,y normalized to [0,1] (image space). The webcam is mirrored (scaleX(-1)). The existing orthographic camera uses `left=-aspect, right=aspect, top=1, bottom=-1`. Convert MediaPipe coords to this camera space.
**When to use:** Every frame when face is detected, to update the particle spawn center.
**Example:**
```typescript
// MediaPipe landmarks: x in [0,1], y in [0,1]
// Webcam is mirrored, so x needs to be flipped
// Ortho camera: x in [-aspect, aspect], y in [-1, 1]
function landmarkToScene(
  landmark: { x: number; y: number },
  aspect: number
): { x: number; y: number } {
  // Mirror x (webcam is flipped), then map [0,1] to [-aspect, aspect]
  const sceneX = (landmark.x * 2 - 1) * aspect;  // already mirrored by video scaleX(-1)
  const sceneY = -(landmark.y * 2 - 1);            // flip y: MediaPipe y=0 is top, scene y=1 is top
  return { x: sceneX, y: sceneY };
}
```

### Pattern 4: Morph-in-Place Emotion Transitions
**What:** When emotion changes, existing particles gradually lerp their color, speed, and direction toward the new emotion profile. No particles are killed or respawned -- they smoothly morph. This pairs with Phase 2's EMA smoothing.
**When to use:** Always. The user specifically requested morph-in-place transitions.
**Example:**
```typescript
// Each frame, lerp particle parameters toward target emotion profile
const lerpFactor = 0.02; // slow transition, ~2-3 seconds at 60fps
currentColor.lerp(targetColor, lerpFactor);
currentSpeed += (targetSpeed - currentSpeed) * lerpFactor;
currentDirection.lerp(targetDirection, lerpFactor);
```

### Pattern 5: Adaptive Quality Scaling
**What:** Monitor FPS using the stats.js instance already in the project. When FPS drops below 30 for a sustained period (~1 second), reduce the maximum active particle count. When FPS recovers, gradually increase back. Show a subtle quality indicator.
**When to use:** Always. Required by PRT-08.
**Example:**
```typescript
class QualityScaler {
  private targetCount: number;
  private readonly maxCount: number;
  private readonly minCount: number;
  private lowFpsFrames = 0;

  adjust(currentFps: number): number {
    if (currentFps < 30) {
      this.lowFpsFrames++;
      if (this.lowFpsFrames > 30) { // ~1 second of low FPS
        this.targetCount = Math.max(this.minCount, this.targetCount * 0.7);
        this.lowFpsFrames = 0;
      }
    } else {
      this.lowFpsFrames = 0;
      if (this.targetCount < this.maxCount) {
        this.targetCount = Math.min(this.maxCount, this.targetCount * 1.02);
      }
    }
    return Math.floor(this.targetCount);
  }
}
```

### Anti-Patterns to Avoid
- **Creating/destroying particles dynamically:** Never use `new Float32Array` or resize buffers during the render loop. Pre-allocate and use ring buffer + setDrawRange.
- **Updating uniforms inside traverse():** Update uniforms directly on the material reference, not by traversing the scene graph.
- **Using PointsMaterial for custom effects:** PointsMaterial is limited. ShaderMaterial is required for custom glow, per-particle color, noise, and lifetime effects.
- **Reading back from GPU:** Never use readPixels or similar for particle state. Keep all particle state CPU-side in typed arrays.
- **Hard-switching emotion profiles:** Never instantly swap colors/speeds. Always lerp over time to maintain the ethereal feel.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D Simplex noise | Custom noise function | Ashima/stegu webgl-noise (MIT) | Battle-tested GLSL implementation, correctly handles all edge cases, used by thousands of projects |
| Post-processing bloom | Custom multi-pass glow shader | three/addons UnrealBloomPass + EffectComposer | Complex multi-pass gaussian blur + threshold; Three.js ships a production-ready implementation |
| FPS monitoring | Custom frame counter | stats.js (already installed) | Accurate timing with multiple panels, already integrated in the project |
| GLSL file imports | Template literal strings in TS | vite-plugin-glsl | Handles #include directives, proper source maps, minification, type support |
| Color interpolation | Manual RGB lerp | THREE.Color.lerp() / lerpColors() | Handles color space correctly, already available in Three.js |
| Easing functions | Custom math | Built-in Math + smoothstep in GLSL | GLSL smoothstep is hardware-accelerated; Three.js MathUtils has lerp/clamp |

**Key insight:** The particle system itself is custom (ShaderMaterial + BufferGeometry), but every sub-component (noise, bloom, FPS monitoring, color math, GLSL imports) has a battle-tested solution. The custom work is in the orchestration: connecting emotion state to particle behavior.

## Common Pitfalls

### Pitfall 1: Forgetting needsUpdate on BufferAttributes
**What goes wrong:** Particles appear frozen or in their initial positions despite updating the typed arrays.
**Why it happens:** Three.js caches buffer data on the GPU. Modifying the CPU-side Float32Array does nothing until you signal the update.
**How to avoid:** After modifying any attribute array, set `geometry.attributes.position.needsUpdate = true` (and same for color, size, lifetime). Do this every frame for dynamic attributes.
**Warning signs:** Particles render but do not move or change color.

### Pitfall 2: setDrawRange vs. Active Particle Count Mismatch
**What goes wrong:** Ghost particles appear at position (0,0,0) or visual artifacts from uninitialized buffer regions.
**Why it happens:** setDrawRange(0, count) draws `count` vertices, but if those buffer slots have stale data from recycled particles, you see ghosts.
**How to avoid:** When recycling a particle slot, always reset its position to the spawn point. Set `lifetime` attribute to 0 for dead particles and discard in the fragment shader.
**Warning signs:** Occasional flashes at the origin or random particles in unexpected positions.

### Pitfall 3: Coordinate System Mismatch (MediaPipe vs. Scene)
**What goes wrong:** Particles spawn in the wrong location (corners, off-screen, mirrored incorrectly).
**Why it happens:** MediaPipe landmarks are in [0,1] normalized image space (y=0 at top). The webcam is mirrored via CSS `scaleX(-1)`. The orthographic camera uses `[-aspect, aspect]` for x and `[-1, 1]` for y (y=1 at top). Getting the mapping wrong means particles are inverted or offset.
**How to avoid:** Write a dedicated `landmarkToScene()` function and unit test it with known landmark positions. Account for the video mirror explicitly.
**Warning signs:** Particles spawn at bottom when face is at top, or spawn on opposite side.

### Pitfall 4: Additive Blending Without Disabling Depth Write
**What goes wrong:** Particles render with z-fighting artifacts, or particles behind other particles are invisible.
**Why it happens:** Additive blending adds colors together, but depth write causes the first-rendered particle to block others at the same depth.
**How to avoid:** Always set `depthWrite: false` and `depthTest: false` on the ShaderMaterial when using AdditiveBlending.
**Warning signs:** Particles flicker or have hard edges where they overlap.

### Pitfall 5: gl_PointSize Clamping
**What goes wrong:** Particles appear as tiny dots regardless of the size attribute value.
**Why it happens:** WebGL implementations clamp gl_PointSize to a device-dependent maximum (often 64-256 pixels). Some mobile GPUs cap at very small sizes.
**How to avoid:** Query `gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)` at init to know the limits. Design particle sizes within this range. If larger particles are needed, consider using instanced quads instead of Points.
**Warning signs:** Particles look identical in size regardless of the size attribute. All particles look like 1px dots.

### Pitfall 6: Performance Cliff with Post-Processing
**What goes wrong:** Adding UnrealBloomPass causes a sudden FPS drop to unacceptable levels.
**Why it happens:** Bloom requires rendering the scene to a framebuffer, then applying multiple gaussian blur passes at different resolutions. This doubles (or more) the GPU fill-rate cost.
**How to avoid:** Start WITHOUT post-processing. Achieve the glow effect purely in the fragment shader (radial falloff + additive blending). Only add UnrealBloomPass if the shader-only approach is visually insufficient. If added, use a reduced resolution (half or quarter) for the bloom pass.
**Warning signs:** FPS drops significantly when toggling bloom on/off.

### Pitfall 7: HMR Memory Leaks with Particle System
**What goes wrong:** Each hot-reload creates a new particle system without disposing the old one, leaking GPU memory.
**Why it happens:** The existing HMR cleanup in main.ts calls `sceneManager.dispose()` which traverses and disposes geometries/materials. But if particle system state (typed arrays, references) is not properly cleaned up, memory accumulates.
**How to avoid:** ParticleSystem must have a `dispose()` method that: (1) removes Points from scene, (2) disposes geometry, (3) disposes material, (4) nulls typed array references. Wire this into the existing HMR cleanup chain.
**Warning signs:** Memory usage grows with each code save during development.

## Code Examples

Verified patterns from official sources and research:

### Soft Glow Fragment Shader (Radial Falloff)
```glsl
// Source: Three.js particle examples + standard point sprite technique
// Creates a soft circular glow that fades from center to edges

varying vec3 vColor;
varying float vLifetime;

void main() {
  // Distance from center of point sprite [0.0 at center, 0.5 at edge]
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Discard outside the circle
  if (dist > 0.5) discard;

  // Soft exponential falloff for ethereal glow
  float glow = exp(-dist * 6.0) * 0.8 + exp(-dist * 2.0) * 0.2;

  // Fade based on remaining lifetime
  float fade = smoothstep(0.0, 0.2, vLifetime);

  gl_FragColor = vec4(vColor * glow, glow * fade);
}
```

### Vertex Shader with Noise Displacement
```glsl
// Source: Three.js ShaderMaterial docs + stegu/webgl-noise
// Requires: noise3d.glsl #include'd above

uniform float uTime;
uniform vec2 uSpawnCenter;
uniform float uPixelRatio;

attribute vec3 velocity;
attribute float size;
attribute float lifetime;
attribute vec3 customColor;

varying vec3 vColor;
varying float vLifetime;

void main() {
  vColor = customColor;
  vLifetime = lifetime;

  // Apply noise-based organic displacement
  vec3 displaced = position;
  float noiseScale = 0.5;
  displaced.x += snoise(vec3(position.xy * noiseScale, uTime * 0.3)) * 0.05;
  displaced.y += snoise(vec3(position.yx * noiseScale, uTime * 0.3 + 100.0)) * 0.05;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  // Scale point size by pixel ratio for consistent appearance across displays
  gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
```

### CPU-Side Particle Update Loop
```typescript
// Source: Three.js official example pattern + ring buffer best practice
update(deltaTime: number, emotionResult: EmotionResult, faceLandmarks: NormalizedLandmark[] | null): void {
  const profile = this.getEmotionProfile(emotionResult);
  const spawnCenter = faceLandmarks
    ? this.landmarkToScene(faceLandmarks)
    : this.lastKnownSpawnCenter;

  const positions = this.geometry.attributes.position.array as Float32Array;
  const velocities = this.velocityArray; // CPU-only, not a buffer attribute
  const lifetimes = this.geometry.attributes.lifetime.array as Float32Array;
  const colors = this.geometry.attributes.customColor.array as Float32Array;
  const sizes = this.geometry.attributes.size.array as Float32Array;

  for (let i = 0; i < this.activeCount; i++) {
    const i3 = i * 3;

    // Age particle
    lifetimes[i] -= deltaTime * profile.decayRate;

    if (lifetimes[i] <= 0) {
      // Recycle: respawn at face center
      this.spawnParticle(i, spawnCenter, profile);
      continue;
    }

    // Move particle outward from spawn center
    positions[i3] += velocities[i3] * deltaTime * profile.speed;
    positions[i3 + 1] += velocities[i3 + 1] * deltaTime * profile.speed;

    // Lerp color toward target emotion color
    colors[i3] += (profile.color.r - colors[i3]) * 0.02;
    colors[i3 + 1] += (profile.color.g - colors[i3 + 1]) * 0.02;
    colors[i3 + 2] += (profile.color.b - colors[i3 + 2]) * 0.02;
  }

  // Signal GPU update
  this.geometry.attributes.position.needsUpdate = true;
  this.geometry.attributes.lifetime.needsUpdate = true;
  this.geometry.attributes.customColor.needsUpdate = true;
  this.geometry.attributes.size.needsUpdate = true;
}
```

### Emotion Profile Configuration
```typescript
// Source: User decisions from CONTEXT.md + color theory for dark backgrounds

interface EmotionProfile {
  color: THREE.Color;
  colorSecondary: THREE.Color;  // For variation
  speed: number;                // Particle movement speed multiplier
  direction: THREE.Vector2;     // Bias direction (e.g., upward for happy)
  spread: number;               // Angular spread from bias direction
  baseSize: number;             // Base particle size
  sizeVariation: number;        // Random size range
  decayRate: number;            // How fast particles fade (lifetime per second)
  spawnRate: number;            // Particles spawned per second
  noiseAmplitude: number;       // Organic movement intensity
}

const EMOTION_PROFILES: Record<EmotionType, EmotionProfile> = {
  happy: {
    color: new THREE.Color(0.95, 0.75, 0.2),         // warm gold
    colorSecondary: new THREE.Color(0.95, 0.5, 0.6),  // soft pink
    speed: 1.2,
    direction: new THREE.Vector2(0, 1),                // upward
    spread: Math.PI * 0.6,                             // wide spread
    baseSize: 12,
    sizeVariation: 8,
    decayRate: 0.4,
    spawnRate: 40,
    noiseAmplitude: 0.08,
  },
  sad: {
    color: new THREE.Color(0.2, 0.4, 0.9),            // cool blue
    colorSecondary: new THREE.Color(0.3, 0.5, 0.7),   // muted blue
    speed: 0.4,
    direction: new THREE.Vector2(0, -1),               // downward (rain)
    spread: Math.PI * 0.3,                             // narrow
    baseSize: 8,
    sizeVariation: 4,
    decayRate: 0.25,
    spawnRate: 25,
    noiseAmplitude: 0.03,
  },
  angry: {
    color: new THREE.Color(0.95, 0.2, 0.1),           // hot red
    colorSecondary: new THREE.Color(0.95, 0.5, 0.1),  // orange
    speed: 2.0,
    direction: new THREE.Vector2(0, 0.3),              // slight upward (flames)
    spread: Math.PI * 0.8,                             // wide chaotic spread
    baseSize: 10,
    sizeVariation: 10,
    decayRate: 0.6,
    spawnRate: 50,
    noiseAmplitude: 0.15,
  },
  surprised: {
    color: new THREE.Color(0.2, 0.9, 0.9),            // cyan
    colorSecondary: new THREE.Color(0.95, 0.9, 0.3),  // yellow
    speed: 3.0,
    direction: new THREE.Vector2(0, 0),                // radial outward burst
    spread: Math.PI * 2,                               // full 360 degrees
    baseSize: 14,
    sizeVariation: 10,
    decayRate: 0.8,
    spawnRate: 80,                                     // burst
    noiseAmplitude: 0.05,
  },
  neutral: {
    color: new THREE.Color(0.6, 0.65, 0.7),           // silver-grey
    colorSecondary: new THREE.Color(0.5, 0.55, 0.6),  // muted grey
    speed: 0.2,
    direction: new THREE.Vector2(0, 0),                // gentle drift
    spread: Math.PI * 2,                               // omnidirectional
    baseSize: 6,
    sizeVariation: 4,
    decayRate: 0.15,
    spawnRate: 15,
    noiseAmplitude: 0.04,
  },
};
```

### MediaPipe Landmark Face Center Extraction
```typescript
// Source: MediaPipe FaceLandmarker documentation
// Landmarks are 478 points, x/y normalized to [0,1]
// Nose tip = index 1, forehead = index 10, chin = index 152
// Face center approximation: average of nose tip, forehead, chin

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;

function extractFaceCenter(landmarks: NormalizedLandmark[]): { x: number; y: number } {
  const nose = landmarks[NOSE_TIP];
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];

  return {
    x: (nose.x + forehead.x + chin.x) / 3,
    y: (nose.y + forehead.y + chin.y) / 3,
  };
}
```

### EffectComposer with UnrealBloomPass (Optional Enhancement)
```typescript
// Source: Three.js official docs + examples/webgl_postprocessing_unreal_bloom
// Only add if fragment-shader-only glow is visually insufficient

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// In SceneManager or a new PostProcessor class:
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength (keep low for subtle glow)
  0.4,   // radius
  0.2    // threshold (low = more glow)
));
composer.addPass(new OutputPass());

// In render loop: replace renderer.render() with composer.render()
```

### Vite Plugin GLSL Setup
```typescript
// vite.config.ts
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [glsl()],
});
```
```glsl
// particle.vert.glsl - can use #include for shared chunks
#include "noise3d.glsl"

uniform float uTime;
// ... rest of vertex shader
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| THREE.Geometry + PointCloud | THREE.BufferGeometry + THREE.Points | Three.js r125 (2021) | Geometry class removed entirely; BufferGeometry is the only option |
| THREE.PointCloudMaterial | THREE.PointsMaterial | Three.js r72 | Name change; API is the same |
| Custom multi-pass bloom | UnrealBloomPass (built-in addon) | Three.js r89 | Production-quality bloom included with Three.js |
| CPU-only particle physics | GPGPU via GPUComputationRenderer or WebGPU compute | 2023-2024 | GPU compute is standard for 10k+ particles; CPU is fine for < 2000 |
| Separate noise library npm packages | Inline GLSL noise functions (stegu/webgl-noise) | Stable since 2012 | Ashima/stegu noise is the de facto standard; copy the GLSL directly |

**Deprecated/outdated:**
- `THREE.Geometry`: Removed. Use BufferGeometry exclusively.
- `THREE.PointCloud`: Renamed to `THREE.Points`.
- `ShaderParticleEngine` (squarefeet): Unmaintained since 2018; do not use.
- `three-gpu-particle-system` (fazeaction): Archived; do not use.

## Open Questions

Things that could not be fully resolved:

1. **Exact MediaPipe face landmark indices for all features**
   - What we know: Nose tip is approximately index 1 (confirmed by TensorFlow.js FaceMesh). Index 10 is commonly cited as forehead area. Index 152 is commonly cited as chin. The FaceLandmarkerResult.faceLandmarks array contains 478 NormalizedLandmark objects.
   - What is unclear: There is no comprehensive official index-to-feature mapping document from Google. The indices are inferred from community visualization tools and the TensorFlow.js codebase.
   - Recommendation: Use indices 1 (nose tip), 10 (forehead), 152 (chin) for face center estimation. Validate visually during implementation. If positions look wrong, adjust indices using a visualization overlay.
   - Confidence: MEDIUM (community-verified but not officially documented)

2. **gl_PointSize maximum on target hardware**
   - What we know: WebGL clamps gl_PointSize to a device-dependent maximum. Most desktop GPUs support 64-256px. Some mobile GPUs cap at much less.
   - What is unclear: Exact limits on the user's target hardware.
   - Recommendation: Query `ALIASED_POINT_SIZE_RANGE` at init and log a warning if max is below 64. Design particles to look good at 8-20px sizes; larger glow achieved through overlap of multiple particles with additive blending rather than giant point sizes.

3. **Whether UnrealBloomPass is needed or fragment-shader glow suffices**
   - What we know: Fragment shader radial falloff + additive blending creates a soft glow. UnrealBloomPass adds a more dramatic, physically-based bloom but at a performance cost.
   - What is unclear: Whether the fragment-shader-only approach will achieve the "ethereal/magical" aesthetic the user wants.
   - Recommendation: Implement fragment-shader glow first. Add UnrealBloomPass as an optional enhancement behind a flag. Let visual testing determine if bloom is needed.

4. **Light trail implementation approach**
   - What we know: PRT-01 specifies "light trails." Three.js has no built-in trail renderer. Options: (a) store N previous positions per particle and render as a line strip, (b) use the semi-transparent clear trick (render to FBO, fade previous frame), (c) spawn secondary "trail" particles at previous positions.
   - What is unclear: Which approach best fits the ethereal aesthetic while staying performant.
   - Recommendation: Use approach (c) -- each primary particle spawns 2-3 secondary "echo" particles at slightly older positions with decreasing size and opacity. This is the simplest approach that stays within the existing Points rendering pipeline and creates a convincing trail effect without additional render passes. The alternative is to skip explicit trails and rely on the natural overlap of additive-blended particles to create a luminous trail-like appearance.

## Webcam Dimming Approach

The user wants the webcam feed dimmed behind particles. Current setup has the webcam as a `<video>` element at z-index 0 and the Three.js canvas at z-index 1 with a transparent background (alpha: true on WebGLRenderer).

**Recommended approach:** Apply a CSS filter or opacity to the video element to dim it:
```css
#webcam {
  filter: brightness(0.3);  /* Dim to 30% brightness */
}
```

This is the simplest, most performant approach. No shader changes needed. The dark CSS background (#0a0a0f) already exists.

## Sources

### Primary (HIGH confidence)
- Three.js official example `webgl_buffergeometry_custom_attributes_particles` - BufferGeometry + ShaderMaterial + Points pattern with DynamicDrawUsage
- Three.js official docs: [ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial), [Points](https://threejs.org/docs/#api/en/objects/Points), [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry), [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html)
- [stegu/webgl-noise](https://stegu.github.io/webgl-noise/webdemo/) - MIT-licensed GLSL simplex noise 3D implementation (Ashima Arts)
- Existing codebase: SceneManager.ts, EmotionState.ts, FaceDetector.ts, main.ts -- verified exact API surface and integration points
- [vite-plugin-glsl v1.5.1](https://github.com/UstymUkhman/vite-plugin-glsl) - Compatible with Vite 7.x, supports #include for GLSL chunks

### Secondary (MEDIUM confidence)
- [Codrops: Crafting a Dreamy Particle Effect with Three.js and GPGPU](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/) - Verified GPGPU architecture pattern, additive blending + depthWrite:false, EffectComposer + bloom
- [MediaPipe FaceLandmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) - 478 landmarks, normalized [0,1] coordinates, coordinate system
- Three.js forum discussions on [coordinate conversion](https://discourse.threejs.org/t/how-to-convert-mediapipe-facelandmark-coordinates-x-y-z-in-screen-space-to-world-space-coordinates-to-move-a-3d-model/68926) and [particle trails](https://discourse.threejs.org/t/particle-trail-effect/31642)

### Tertiary (LOW confidence)
- MediaPipe face landmark index numbers (1=nose tip, 10=forehead, 152=chin) -- community-inferred, not officially documented by Google
- Exact particle count sweet spot (500-2000) for CPU-side updates -- based on general community guidance, not formal benchmarks on this specific hardware

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js 0.182.0 already installed, APIs verified against official docs and examples
- Architecture: HIGH - Patterns verified against official Three.js examples and multiple authoritative tutorials
- GLSL techniques: HIGH - Simplex noise source verified (Ashima/stegu MIT), fragment shader patterns from official examples
- Emotion profiles: MEDIUM - Color choices and movement patterns are subjective; based on user decisions + design intuition. Will need visual tuning.
- Face landmark mapping: MEDIUM - Coordinate system documented officially; specific landmark indices are community-inferred
- Performance thresholds: MEDIUM - CPU-side updates for ~1500 particles should work but not formally benchmarked

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days -- Three.js stable, techniques well-established)
