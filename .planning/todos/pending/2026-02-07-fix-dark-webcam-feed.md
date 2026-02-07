---
created: 2026-02-07T09:41
title: Fix dark webcam feed — screen is way too dim
area: ui
files:
  - src/main.ts
---

## Problem

The webcam feed appears very dark/dim during normal use. The entire screen looks like it has a heavy darkening overlay or reduced brightness applied. The video element or a CSS layer on top is likely reducing the perceived brightness of the camera feed significantly, making the experience feel washed out and hard to see.

Screenshot reference: neutral emotion state, well-lit room, but feed appears heavily dimmed.

Likely causes to investigate:
- CSS opacity or filter (brightness/contrast) on the video element or a container
- A dark overlay div (e.g., particle canvas background) sitting on top with partial opacity
- Three.js renderer or particle canvas compositing reducing brightness
- Blend mode on the WebGL canvas darkening the underlying video

## Solution

TBD — investigate the compositing stack (video element, overlays, Three.js canvas) and adjust opacity/blend-mode/filters to let the webcam feed show through at natural brightness.
