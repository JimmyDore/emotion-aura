# Phase 3: Particle System - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

An organic, fluid GPU-driven particle system that renders around the user's face and visually transforms based on their detected emotion. Particles spawn from face landmarks, respond to emotion state and intensity, and degrade gracefully under load. Hand gesture interaction and cross-browser polish are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Visual aesthetic
- Ethereal / magical vibe — soft glowing orbs, light trails, dreamy (fireflies, aurora borealis feel)
- Dark background — particles glow against dark for dramatic effect
- Webcam feed dimmed behind particles (visible enough for spatial context, dim enough that particles are the star)
- Morph-in-place transitions — existing particles gradually change color and behavior when emotion shifts (no fade-out/respawn)

### Emotion profiles
- Follow roadmap descriptions: warm lively = happy, cool rain-like = sad, aggressive flame-like = angry, burst/explosion = surprised, calm ambient drift = neutral
- Intensity scaling — stronger expressions produce more particles, brighter glow, faster movement
- Slight smile = subtle effect, big smile = dramatic effect (continuous scaling, not binary)

### Face anchoring
- Particles emanate outward from face position — spawning at face and flowing toward screen edges
- Spawn point follows head movement smoothly (tight tracking, no lag/trail)

### Quality scaling
- Preserve visual quality over quantity — reduce particle count first, keep glow and trails
- Subtle indicator when quality is reduced (small icon or text — useful for portfolio demos)
- Automatic scaling when FPS drops below 30

### Claude's Discretion
- Particle density (balance between performance and immersive aesthetic)
- Whether particles have light trails or glow-only (pick what fits ethereal vibe best)
- Particle travel range before fading (balance performance and visual impact)
- Color palettes per emotion (pick what looks best against dark background with ethereal glow)
- Loading skeleton / initial particle spawn animation
- Exact spacing, sizing, and glow parameters

</decisions>

<specifics>
## Specific Ideas

- Dark background with dimmed webcam feed — like a dark-tinted mirror with ethereal light emanating from face
- Particles should feel magical, not technical — fireflies and aurora borealis, not sparks or data visualization
- Morph transitions pair with Phase 2's EMA smoothing for fluid emotion changes
- Intensity scaling connects directly to Phase 2's per-emotion intensity signals

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-particle-system*
*Context gathered: 2026-02-06*
