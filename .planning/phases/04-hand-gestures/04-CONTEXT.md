# Phase 4: Hand Gestures - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

User can manipulate particles with intuitive hand gestures — pushing, attracting, and concentrating particles. Hand tracking runs alongside face detection. Three gestures recognized: open hand (push), fist (attract), pinch (concentrate). Gesture-to-particle force fields create interactive particle manipulation.

</domain>

<decisions>
## Implementation Decisions

### Gesture feel & responsiveness
- Instant blast onset when gesture is recognized — full force immediately, punchy arcade feel
- Influence radius is hand-sized (~100px) — tight, precise control near the hand
- Each gesture has distinct intensity character: push = explosive, attract = steady pull, pinch = sharp concentration
- When hand leaves frame, forces decay with a quick fade (~300ms) back to emotion-driven behavior

### Force field behavior
- Push (open hand): radial explosion — particles fly outward in all directions from palm position
- Attract (fist): spiral inward — particles orbit in a tightening spiral toward the fist, magnetic feel
- Pinch (concentrate): vortex funnel — particles swirl rapidly into a tight point, tornado-like visual
- Gesture forces override emotion-driven particle behavior completely while active — emotion forces resume after gesture ends

### Visual feedback
- Gesture indicator: small icon/label in a fixed corner of the screen showing current gesture (e.g., push, attract, concentrate)
- Particle colors stay emotion-driven — gestures only affect movement, not appearance
- Subtle aura/glow around the hand position showing the force field radius
- Gesture indicator and emotion overlay both visible simultaneously — separate UI elements

### Hand-face coexistence
- Particle spawn always stays on the face — hand forces redirect particles mid-flight only
- One hand tracked only — simpler, less performance overhead, cleaner interaction
- When hand covers face (occlusion): freeze last emotion state, resume detection when face visible again
- Both emotion overlay and gesture indicator visible on screen at all times

### Claude's Discretion
- Exact aura visual style and opacity
- Gesture icon/label design and exact corner placement
- Force field falloff curve shape
- Spiral orbit tightness and speed parameters for attract
- Vortex funnel rotation speed and convergence rate

</decisions>

<specifics>
## Specific Ideas

- Push should feel like an instant blast, not a gentle breeze — arcade, impactful
- Attract spiral gives a magnetic, satisfying "collecting" feel
- Pinch vortex funnel should look tornado-like — dramatic concentration effect
- Gestures take full control when active, emotion resumes cleanly after — no blending, clean override

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-hand-gestures*
*Context gathered: 2026-02-07*
