# Milestone v1.1: Eye Wink Interactions

**Status:** COMPLETE
**Phases:** 6.1+
**Total Plans:** 1

## Overview

Extends the v1.0 Emotion Aura experience with eye-wink-triggered particle fireworks. Builds on existing FaceLandmarker blendshape detection to recognize individual eye closures and trigger spectacular directional particle bursts.

## Phases

### Phase 6.1: Eye Wink Firework Particles (INSERTED)

**Goal:** Detect individual eye winks AND blinks via blendshapes and trigger spectacular firework particle bursts — left eye closed = GOLD firework on the left side, right eye closed = CYAN firework on the right side, blink = DOUBLE firework on both sides
**Depends on:** Phase 6 (v1.0 complete)
**Plans:** 1 plan

Plans:
- [x] 06.1-01-PLAN.md — WinkDetector + FireworkSpawner + main.ts integration (8-color palette, 150 particles, 250ms cooldown, blinks = double firework)

**Details:**
Leverage existing FaceLandmarker blendshapes (eyeBlinkLeft, eyeBlinkRight) to detect individual eye winks and blinks. Trigger dramatic firework bursts on the corresponding screen side:
- Left eye closed → GOLD particle firework on the LEFT side of the screen
- Right eye closed → CYAN particle firework on the RIGHT side of the screen
- Both eyes closed (blink) → DOUBLE firework (GOLD left + CYAN right simultaneously)
- 150 particles per burst, 5-8 second lifetime, weightless radial expansion, 250ms rapid-fire cooldown
- Shared ParticlePool — hand gestures automatically affect firework particles

---

## Milestone Summary

**Decimal Phases:**

- Phase 6.1 inserted after Phase 6: Eye wink firework particles (URGENT)

**Key Decisions:**

- 8-color rotating palette instead of fixed GOLD/CYAN per side (user feedback)
- Randomized burst positions within screen halves (user feedback)
- 15-20 second particle lifetime instead of 5-8s (user feedback)

**Issues Resolved:**

(None yet)

**Issues Deferred:**

(None yet)

**Technical Debt Incurred:**

(None yet)

---

_For current project status, see .planning/STATE.md_
