# Phase 1: Camera & Foundation - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the project scaffold, webcam integration with permission handling, error states, ML model loading UX, and mobile detection. User opens the app, grants camera access with clear guidance, and sees their mirrored webcam feed in a clean browser interface.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User trusts Claude's judgment on all implementation choices for this phase. The following areas are open for Claude to decide during research and planning:

**Permission flow:**
- Pre-prompt screen design and messaging tone
- How to explain why camera access is needed
- Visual treatment of the permission request step

**Visual design & layout:**
- Webcam feed presentation (fullscreen vs contained, aspect ratio handling)
- Overall app aesthetic and mood
- Any overlays or UI chrome around the feed

**Error & edge cases:**
- Error message tone and visual treatment for denied/unavailable/in-use camera
- Recovery options and guidance presented to the user
- Graceful degradation behavior

**Loading experience:**
- Progress indication style while ML models download
- What to show/hide during loading
- Branding and visual treatment of the loading state

**Mobile detection:**
- "Best on desktop" message design and tone
- Whether to block entirely or show a degraded experience

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants Claude to make all design and UX decisions for this foundation phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-camera-foundation*
*Context gathered: 2026-02-06*
