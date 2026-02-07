# Phase 5: Performance & Polish - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-browser compatibility, performance tuning, and portfolio-quality visual polish for the complete emotion-particle-gesture experience. The full pipeline (face detection, emotion classification, hand detection, gesture recognition, particle rendering) is already functional — this phase makes it production-ready and visually impressive.

</domain>

<decisions>
## Implementation Decisions

### Particle visual style
- Neon energy sparks aesthetic: tight bright cores with medium glow halos — vibrant, electric feel
- Not soft/ethereal or dot-like — particles should feel like energy sparks
- Emotion intensity should NOT heavily influence particle behavior (classification isn't reliable enough to lean on intensity)

### Webcam brightness
- Face must be clearly visible — webcam is the backdrop, particles overlay on top
- Current webcam feed is too dim — needs significant brightness fix
- The face should be easily recognizable at all times

### Particle spawn position
- Move spawn origin from ear landmarks to around head outline (halo/ring)
- Particles emanate outward from the head silhouette like an aura
- Current ear-based spawn feels unnatural

### Face exclusion zone
- Not needed — with clearly visible webcam and neon sparks, face obstruction isn't a concern
- Skip this optimization

### Performance degradation
- Reduce particle count first when FPS drops
- Keep ML detection and gesture responsiveness intact as long as possible
- Adaptive quality adjustments should be silent (no visual indicator when quality reduces)

### FPS stats display
- FPS/stats overlay visible by default
- Small toggle button on screen to hide/show the stats
- Clean enough to leave on during portfolio demos

### Layout
- Fullscreen immersive — webcam + particles fill the entire viewport
- No visible UI chrome or framing — pure experience

### Overlays (emotion + gesture labels)
- Visible by default in corners (demonstrates the tech to portfolio viewers)
- Toggle button to hide/show overlays
- When hidden, fully immersive; when shown, helps viewers understand what's happening

### Branding
- "Emotion Aura" title visible on screen
- Link to jimmydore.fr (clickable)
- Minimal but present — identifies the project and creator

### Claude's Discretion
- FPS target (balance between visual quality and smoothness)
- Toggle button design and placement (should fit fullscreen immersive aesthetic)
- Color mixing tuning for emotion blends
- Cross-browser fix specifics (Chrome, Firefox, Safari)
- Exact glow shader parameters for neon spark look

</decisions>

<specifics>
## Specific Ideas

- Particles from ears feel weird — spawn from head outline instead (aura emanating outward)
- Emotion intensity isn't reliable enough to drive behavior — keep reactions consistent regardless of expression strength
- Stats button should be a small on-screen button, not just a keyboard shortcut
- Portfolio link: jimmydore.fr

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-performance-polish*
*Context gathered: 2026-02-07*
