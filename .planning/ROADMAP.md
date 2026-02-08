# Milestone v1.1: Eye Wink Interactions

**Status:** IN PROGRESS
**Phases:** 6.1+
**Total Plans:** 1

## Overview

Extends the v1.0 Emotion Aura experience with eye-wink-triggered particle fireworks. Builds on existing FaceLandmarker blendshape detection to recognize individual eye closures and trigger spectacular directional particle bursts.

## Phases

### Phase 6.1: Eye Wink Firework Particles (INSERTED)

**Goal:** Detect individual eye closures (winks) and trigger spectacular firework particle bursts — right eye closed = blue firework on the right side of the screen, left eye closed = red firework on the left side of the screen
**Depends on:** Phase 6 (v1.0 complete)
**Plans:** 1 plan

Plans:
- [ ] 06.1-01-PLAN.md -- WinkDetector + FireworkSpawner + main.ts integration

**Details:**
Leverage existing FaceLandmarker blendshapes (eyeBlinkLeft, eyeBlinkRight) to detect individual eye closures. When a wink is detected, spawn a dramatic firework burst of particles on the corresponding screen side:
- Right eye closed → blue particle firework explosion on the RIGHT side of the screen
- Left eye closed → red particle firework explosion on the LEFT side of the screen
- Both visual effects should be spectacular "firework" style — rapid burst, spread, and fade

---

## Milestone Summary

**Decimal Phases:**

- Phase 6.1 inserted after Phase 6: Eye wink firework particles (URGENT)

**Key Decisions:**

(None yet)

**Issues Resolved:**

(None yet)

**Issues Deferred:**

(None yet)

**Technical Debt Incurred:**

(None yet)

---

_For current project status, see .planning/STATE.md_
