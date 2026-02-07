---
phase: 03-particle-system
plan: 01
subsystem: rendering
tags: [three.js, glsl, shaders, particles, simplex-noise, webgl, ring-buffer]

# Dependency graph
requires:
  - phase: 01-camera-foundation
    provides: SceneManager with orthographic camera and transparent WebGL renderer
provides:
  - GLSL shader pipeline (simplex noise, vertex displacement, soft-glow fragment)
  - Pre-allocated ring-buffer particle pool (ParticlePool)
  - Three.js Points mesh with custom ShaderMaterial (ParticleSystem)
  - vite-plugin-glsl for shader file imports with #include support
affects: [03-02, 03-03, 04-gesture-control, 05-polish]

# Tech tracking
tech-stack:
  added: [vite-plugin-glsl@1.5.1]
  patterns: [ring-buffer particle pool, custom ShaderMaterial with additive blending, GLSL #include via vite plugin]

key-files:
  created:
    - src/particles/shaders/noise3d.glsl
    - src/particles/shaders/particle.vert.glsl
    - src/particles/shaders/particle.frag.glsl
    - src/particles/ParticlePool.ts
    - src/particles/ParticleSystem.ts
    - src/glsl.d.ts
  modified:
    - vite.config.ts
    - package.json

key-decisions:
  - "Used Ashima/stegu MIT-licensed simplex noise (standard GLSL implementation, not hand-rolled)"
  - "Ring buffer swap-to-last-active strategy for dead particle recycling (O(1) per particle, keeps active region contiguous)"
  - "DynamicDrawUsage on all buffer attributes for optimal GPU streaming"
  - "gl_PointSize scaled by 300.0 / -mvPosition.z as base factor for ortho camera at z=1"

patterns-established:
  - "GLSL shaders in src/particles/shaders/ with #include for shared chunks"
  - "ParticlePool owns typed arrays, ParticleSystem owns geometry/material/mesh"
  - "BufferAttribute.needsUpdate = true each frame for dynamic particle data"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 1: GPU Particle Rendering Foundation Summary

**Custom GLSL shaders with simplex noise displacement and soft-glow falloff, pre-allocated ring-buffer particle pool, and Three.js Points mesh with additive blending ShaderMaterial**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-07T06:56:02Z
- **Completed:** 2026-02-07T06:58:17Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three GLSL shaders: 3D simplex noise (Ashima/stegu MIT), vertex shader with noise displacement and HiDPI point sizing, fragment shader with exponential radial glow and lifetime-based fade
- ParticlePool: zero-allocation ring buffer managing 1500 particles with spawn/update/recycle lifecycle, swap-to-last-active dead particle removal, velocity damping, and quality scaling cap
- ParticleSystem: Three.js Points mesh with custom ShaderMaterial using additive blending, dynamic draw range, and full dispose lifecycle for HMR cleanup
- vite-plugin-glsl configured for GLSL file imports with #include directive support

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plugin-glsl and create GLSL shaders** - `f817e8e` (feat)
2. **Task 2: ParticlePool ring buffer and ParticleSystem Three.js mesh** - `aed82f4` (feat)

## Files Created/Modified
- `vite.config.ts` - Added glsl() plugin to Vite configuration
- `src/glsl.d.ts` - TypeScript type declaration for .glsl module imports
- `src/particles/shaders/noise3d.glsl` - Ashima/stegu 3D simplex noise function (MIT)
- `src/particles/shaders/particle.vert.glsl` - Vertex shader: noise displacement, point sizing, varying pass-through
- `src/particles/shaders/particle.frag.glsl` - Fragment shader: radial glow falloff, circular mask, lifetime fade
- `src/particles/ParticlePool.ts` - Ring-buffer particle pool with pre-allocated Float32Arrays
- `src/particles/ParticleSystem.ts` - Three.js Points mesh with custom ShaderMaterial and pool integration
- `package.json` - Added vite-plugin-glsl devDependency

## Decisions Made
- Used Ashima/stegu MIT-licensed simplex noise -- battle-tested GLSL implementation from webgl-noise repo, not hand-rolled
- Ring buffer uses swap-to-last-active strategy for dead particles -- O(1) per particle, keeps active region contiguous for setDrawRange
- All buffer attributes set to DynamicDrawUsage for optimal GPU streaming of per-frame updates
- gl_PointSize base scale factor of 300.0 chosen to produce visible particles with ortho camera at z=1

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- Particle rendering core complete, ready for emotion profile mapping (Plan 02) and face-anchored spawning (Plan 03)
- ParticlePool.setMaxActive() ready for QualityScaler integration
- ParticleSystem.setSpawnCenter() ready for face landmark coordinate mapping
- ParticleSystem.getPool() exposed for external quality scaling

---
*Phase: 03-particle-system*
*Completed: 2026-02-07*
