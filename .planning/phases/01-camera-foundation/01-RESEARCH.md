# Phase 1: Camera & Foundation - Research

**Researched:** 2026-02-06
**Domain:** Project scaffold, webcam integration, permission UX, model loading, mobile detection
**Confidence:** HIGH

## Summary

Phase 1 delivers the project scaffold (Vite 7 + TypeScript + Three.js), webcam integration with a polished permission flow, error handling for all camera failure modes, a loading screen with real progress indication for MediaPipe model downloads (~9MB), and mobile device detection. This phase establishes the architecture that all subsequent phases build on.

The standard approach is: Vite 7 vanilla-ts template for the scaffold, `navigator.mediaDevices.getUserMedia` with explicit constraints (640x480, 30fps, facingMode: user), a custom pre-prompt screen before the browser permission dialog, and a loading UX that manually fetches MediaPipe model files via the Fetch API with ReadableStream progress tracking. Three.js is initialized with `alpha: true` for transparent overlay on the video feed. Mobile detection uses a combination of `navigator.maxTouchPoints`, screen width media queries, and `navigator.userAgentData` (Client Hints API) where available.

All decisions in this phase are at Claude's discretion per the CONTEXT.md. This research provides prescriptive recommendations for each.

**Primary recommendation:** Build a three-screen flow: (1) pre-prompt explanation screen with "Start Experience" button, (2) loading screen with progress bar while models download and camera initializes in parallel, (3) live mirrored webcam feed with transparent Three.js canvas overlay ready for particles.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | ^7.3 | Build tool, dev server, HMR | Current major version (7.x). Fastest DX for vanilla TS projects. Native ESM, near-instant HMR. |
| TypeScript | ^5.9 | Type safety | Current stable (5.9.3). Type safety critical when mixing WebGL buffers, ML tensors, DOM. |
| Three.js | ^0.182 | WebGL abstraction, particle renderer foundation | Current release (r182). Industry standard for browser 3D. Only scene setup needed in Phase 1. |
| @mediapipe/tasks-vision | ^0.10.32 | Face + hand landmark detection (model loading in Phase 1) | Latest stable. Google's unified Vision Tasks API. Only model preloading needed in Phase 1. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/three | ^0.182 | TypeScript definitions for Three.js | Always -- required for TS compilation with Three.js |
| stats.js | ^0.17 | FPS/MS performance monitor | Development only. Add in Phase 1 scaffold to track performance from day one. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite 7 | Webpack 5 | Webpack is slower, more config. Vite is strictly better for new projects. |
| Vanilla TS | React/Vue | Framework adds bundle bloat and fights the rAF render loop. This is a canvas app, not a form app. |
| Three.js r182 | Raw WebGL | Three.js adds ~150KB but saves weeks of matrix math, camera setup, shader pipeline boilerplate. |

**Installation:**
```bash
# Create project scaffold
npm create vite@latest emotion-aura -- --template vanilla-ts
cd emotion-aura

# Core dependencies
npm install three @mediapipe/tasks-vision

# Type definitions and dev tools
npm install -D @types/three stats.js
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)
```
emotion-aura/
  src/
    main.ts                    # Entry point: orchestrates app startup flow
    camera/
      CameraManager.ts         # getUserMedia, stream lifecycle, error handling
    ml/
      ModelLoader.ts           # Fetch models with progress, init MediaPipe
    scene/
      SceneManager.ts          # Three.js scene, camera, renderer setup
    ui/
      PermissionScreen.ts      # Pre-prompt explanation screen
      LoadingScreen.ts         # Model download progress UI
      ErrorScreen.ts           # Camera error messages and recovery guidance
      MobileGate.ts            # Mobile detection and "best on desktop" message
    core/
      types.ts                 # Shared TypeScript interfaces
      constants.ts             # Thresholds, URLs, config values
  public/
    models/                    # (Optional) Self-hosted MediaPipe model files
  index.html
  vite.config.ts
  tsconfig.json
```

### Pattern 1: Three-Screen Startup Flow
**What:** A sequential UX flow: Explain -> Load -> Experience
**When to use:** Any app requiring permission grants and heavy asset downloads before core experience.
**Why:** Users abandon apps that show blank screens. Each screen has clear purpose and progress.

```
Screen 1: PermissionScreen
  - Dark, clean aesthetic
  - Brief explanation: "This experience uses your camera to detect expressions
    and create a living particle aura around you"
  - Camera icon/animation
  - "Start Experience" button (large, centered)
  - User clicks -> triggers getUserMedia AND model loading in parallel

Screen 2: LoadingScreen
  - Shows after permission granted
  - Progress bar tracking model downloads (face_landmarker + hand_landmarker)
  - Percentage and "Loading AI models..." text
  - Camera feed can start playing in background (behind overlay)
  - Transitions automatically when models ready

Screen 3: Live Experience
  - Mirrored webcam feed (CSS transform: scaleX(-1))
  - Transparent Three.js canvas overlaid via position: absolute
  - Ready for particles in Phase 3
```

### Pattern 2: Parallel Initialization
**What:** Camera permission request and model downloading happen simultaneously.
**When to use:** When multiple independent async operations must complete before the app starts.
**Why:** Saves 3-8 seconds vs sequential loading. User grants camera while models download in background.

```typescript
// Source: Standard async parallel pattern
async function initializeApp(): Promise<void> {
  // These are independent -- run in parallel
  const [cameraStream, models] = await Promise.all([
    cameraManager.requestAccess(),  // getUserMedia
    modelLoader.loadModels((progress) => {
      loadingScreen.updateProgress(progress);
    })
  ]);

  // Both ready -- transition to live experience
  cameraManager.attachStream(cameraStream);
  sceneManager.initialize();
  loadingScreen.hide();
}
```

### Pattern 3: Transparent Canvas Overlay
**What:** Three.js renders on a transparent canvas positioned absolutely over the video element.
**When to use:** Any WebGL overlay on top of a video feed.
**Why:** Video plays natively (best performance), Three.js renders only particles (no video texture overhead).

```typescript
// Source: Three.js docs + community pattern
const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement,
  antialias: true,
  alpha: true,          // Enable transparent background
});
renderer.setClearColor(0x000000, 0);  // Fully transparent clear
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Cap at 2x for performance

// CSS layout: video underneath, canvas on top
// <div id="app">
//   <video id="webcam" style="transform: scaleX(-1)"></video>
//   <canvas id="scene" style="position: absolute; top: 0; left: 0"></canvas>
// </div>
```

### Pattern 4: Vite HMR Cleanup
**What:** Properly dispose Three.js resources on hot module replacement.
**When to use:** Always, from day one of Three.js setup.
**Why:** Without cleanup, each HMR update leaks a WebGL context. After 8-16 edits, the browser runs out of contexts and rendering breaks.

```typescript
// Source: Vite docs + Three.js disposal pattern
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    renderer.dispose();
    scene.traverse((obj: THREE.Object3D) => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
        else mat.dispose();
      }
    });
    // Also stop camera stream
    cameraManager.stop();
  });
}
```

### Anti-Patterns to Avoid
- **Calling getUserMedia on page load without user interaction:** Browser shows permission prompt with zero context. Users deny by reflex. Always show explanation first.
- **Requesting high resolution for webcam:** Default camera resolution (1080p on MacBooks) wastes bandwidth. MediaPipe internally downscales to ~256x256 anyway. Request 640x480.
- **Using `modelAssetPath` without progress tracking:** MediaPipe's built-in model loading provides no progress callback. Models are 5-10MB total. Use manual `fetch` with ReadableStream instead.
- **Multiple requestAnimationFrame loops:** Create a single rAF loop from day one. Even in Phase 1, establish the pattern that Phase 2+ will use.
- **Not handling WebGL context loss:** Listen for `webglcontextlost` and `webglcontextrestored` events from Phase 1.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL scene management | Custom WebGL buffer/shader pipeline | Three.js WebGLRenderer + Scene + Camera | Three.js handles matrix math, shader compilation, buffer management. Raw WebGL takes weeks. |
| Camera device enumeration | Custom device listing | `getUserMedia` constraints with `facingMode: 'user'` | The browser handles device selection. Explicit enumeration adds complexity. |
| Build tooling | Webpack config, custom bundler | `npm create vite@latest -- --template vanilla-ts` | Vite works out of the box. Zero config needed for this project. |
| CSS-in-JS | React/styled-components for 5 UI screens | Vanilla CSS with custom properties | 95% of the app is canvas. The UI is ~100 lines of CSS total. |
| FPS monitoring | Custom performance.now() loop | stats.js | Battle-tested, ~2KB, shows FPS/MS/MB in a tiny overlay. |

**Key insight:** Phase 1 is a scaffold phase. Everything should be the simplest correct solution. Complexity comes in Phase 2+ when ML inference and particle systems are added.

## Common Pitfalls

### Pitfall 1: Requesting Camera Without Explanation
**What goes wrong:** App calls `getUserMedia` immediately. Browser shows permission prompt. User has no idea why a website wants camera access. User denies. No recovery offered.
**Why it happens:** Developers always click "Allow" during testing. They never test the deny flow.
**How to avoid:** Show a pre-prompt screen explaining what the camera is for. Only call `getUserMedia` after user clicks "Start Experience." Handle all deny paths with clear recovery instructions.
**Warning signs:** getUserMedia called in top-level code or module initialization.

### Pitfall 2: Not Handling All getUserMedia Error Types
**What goes wrong:** App catches a generic error and shows "Camera error." User denied permission? Same message. No camera found? Same message. Camera in use? Same message. User has no idea how to fix it.
**Why it happens:** Developers only test the happy path. Error types vary across browsers.
**How to avoid:** Catch errors by name and show specific messages:
- `NotAllowedError`: "Camera access was denied. Click the camera icon in your browser's address bar to allow access, then refresh."
- `NotFoundError`: "No camera detected. Please connect a webcam and refresh."
- `NotReadableError`: "Your camera is being used by another application. Close other apps using the camera and try again."
- `OverconstrainedError`: "Your camera doesn't support the required settings. Try a different camera."
- `TypeError` / `SecurityError`: "Camera access requires a secure connection (HTTPS)."
**Warning signs:** A single `catch` block with a generic error message.

### Pitfall 3: No Loading Progress for Model Downloads
**What goes wrong:** MediaPipe models are 5-10MB total. On average connections, download takes 5-15 seconds. Screen is blank or shows a spinner with no indication of progress. Portfolio reviewers close the tab.
**Why it happens:** MediaPipe's `modelAssetPath` option loads models internally with no progress callback. Developers don't realize they can fetch manually.
**How to avoid:** Use the Fetch API with `ReadableStream` to download model files with byte-level progress tracking. Pass the resulting `ArrayBuffer` as `modelAssetBuffer` to `createFromOptions`. Show a progress bar with percentage.
**Warning signs:** Using `modelAssetPath` for model loading, or showing an indeterminate spinner.

### Pitfall 4: Video Resolution Too High
**What goes wrong:** Camera defaults to 1080p. Large frames waste GPU bandwidth copying to MediaPipe (which downscales internally). Memory usage climbs. No improvement in detection quality.
**Why it happens:** `getUserMedia({ video: true })` uses camera defaults, which on modern laptops is 720p or 1080p.
**How to avoid:** Explicitly constrain: `{ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' } }`.
**Warning signs:** `video.videoWidth` reports > 640 in any dimension.

### Pitfall 5: Three.js Zombie Renderers During Development
**What goes wrong:** Each Vite HMR update creates a new Three.js renderer without disposing the old one. After several edits, performance degrades. Multiple canvases appear in the DOM.
**Why it happens:** Three.js doesn't auto-cleanup. HMR replaces modules but doesn't call destructors.
**How to avoid:** Implement `import.meta.hot.dispose()` cleanup that calls `renderer.dispose()` and traverses the scene to dispose all geometries and materials. Also stop camera streams.
**Warning signs:** Multiple `<canvas>` elements in DOM during development. GPU memory climbing in DevTools.

### Pitfall 6: Forgetting the Mirror Transform
**What goes wrong:** Webcam feed is not mirrored. User moves left, video moves right. Feels unnatural and disorienting.
**Why it happens:** Webcam hardware returns a non-mirrored image. Mirroring must be applied manually.
**How to avoid:** Apply `transform: scaleX(-1)` CSS to the video element. This mirrors the display while MediaPipe still receives the original orientation. When connecting landmarks to the particle system (Phase 2+), remember to flip the X coordinate: `screenX = 1.0 - landmark.x`.
**Warning signs:** Moving your hand left makes the video-hand move right.

## Code Examples

Verified patterns from official sources and established community practice:

### getUserMedia with Full Error Handling
```typescript
// Source: MDN getUserMedia docs + addpipe.com error reference
interface CameraError {
  type: 'denied' | 'not-found' | 'in-use' | 'overconstrained' | 'security' | 'unknown';
  message: string;
  recoveryHint: string;
}

async function requestCamera(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: 'user',
      },
      audio: false,
    });
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          throw {
            type: 'denied',
            message: 'Camera access was denied',
            recoveryHint: 'Click the camera icon in your browser\'s address bar to allow access, then refresh the page.',
          } as CameraError;
        case 'NotFoundError':
          throw {
            type: 'not-found',
            message: 'No camera detected',
            recoveryHint: 'Please connect a webcam and refresh the page.',
          } as CameraError;
        case 'NotReadableError':
          throw {
            type: 'in-use',
            message: 'Camera is in use by another application',
            recoveryHint: 'Close any other apps using your camera (video calls, screen recording), then try again.',
          } as CameraError;
        case 'OverconstrainedError':
          throw {
            type: 'overconstrained',
            message: 'Camera doesn\'t support required settings',
            recoveryHint: 'Try connecting a different camera.',
          } as CameraError;
        case 'SecurityError':
          throw {
            type: 'security',
            message: 'Camera access requires a secure connection',
            recoveryHint: 'Make sure you\'re accessing this page via HTTPS.',
          } as CameraError;
      }
    }
    throw {
      type: 'unknown',
      message: 'An unexpected error occurred',
      recoveryHint: 'Please refresh the page and try again.',
    } as CameraError;
  }
}
```

### Model Loading with Progress Tracking
```typescript
// Source: Fetch API ReadableStream pattern (javascript.info) + MediaPipe modelAssetBuffer option
interface LoadProgress {
  loaded: number;    // bytes loaded
  total: number;     // total bytes (from Content-Length)
  percent: number;   // 0-100
  label: string;     // "Loading face detection model..."
}

async function fetchModelWithProgress(
  url: string,
  label: string,
  onProgress: (progress: LoadProgress) => void,
): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch model: ${response.status}`);

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  const reader = response.body!.getReader();

  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    onProgress({
      loaded: receivedLength,
      total: contentLength,
      percent: contentLength > 0 ? Math.round((receivedLength / contentLength) * 100) : 0,
      label,
    });
  }

  // Concatenate chunks into single Uint8Array
  const result = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }

  return result;
}
```

### MediaPipe Initialization with Pre-fetched Models
```typescript
// Source: MediaPipe Face Landmarker web guide (ai.google.dev)
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

async function initializeMediaPipe(
  faceModelBuffer: Uint8Array,
  onProgress: (msg: string) => void,
): Promise<FaceLandmarker> {
  onProgress('Initializing AI runtime...');
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  onProgress('Setting up face detection...');
  const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer: faceModelBuffer,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  return faceLandmarker;
}
```

### Three.js Scene Setup (Transparent Overlay)
```typescript
// Source: Three.js WebGLRenderer docs + community transparent overlay pattern
import * as THREE from 'three';

function createScene(canvas: HTMLCanvasElement): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
} {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();

  // Orthographic camera for 2D particle overlay
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -aspect, aspect, 1, -1, 0.1, 100
  );
  camera.position.z = 1;

  // Handle resize
  window.addEventListener('resize', () => {
    const newAspect = window.innerWidth / window.innerHeight;
    camera.left = -newAspect;
    camera.right = newAspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
```

### Mobile Detection
```typescript
// Source: MDN navigator.maxTouchPoints + matchMedia + Client Hints API
function isMobileDevice(): boolean {
  // Method 1: Client Hints API (most reliable, Chrome/Edge only)
  if ('userAgentData' in navigator) {
    const uaData = (navigator as any).userAgentData;
    if (uaData && typeof uaData.mobile === 'boolean') {
      return uaData.mobile;
    }
  }

  // Method 2: Screen width check (reliable for small phones)
  if (window.matchMedia('(max-width: 768px)').matches) {
    return true;
  }

  // Method 3: Touch + pointer check (catches tablets too)
  if (
    navigator.maxTouchPoints > 0 &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return true;
  }

  return false;
}
```

### Vite Configuration for COOP/COEP Headers
```typescript
// Source: Vite docs + community pattern for SharedArrayBuffer support
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

**Note:** COOP/COEP headers may be needed if MediaPipe's WASM runtime uses SharedArrayBuffer for threading. These headers cause cross-origin resources to require CORS headers. The MediaPipe CDN (jsdelivr) supports CORS. If self-hosting model files, ensure the server also sends appropriate CORS headers. Test whether MediaPipe works without these headers first -- they add cross-origin complexity.

### Permissions API Pre-Check
```typescript
// Source: MDN Permissions API docs
// Check camera permission state before showing pre-prompt
async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state;
  } catch {
    // Firefox does not support querying camera permission
    // Fall back to 'prompt' (show the pre-prompt screen)
    return 'prompt';
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @mediapipe/face_mesh (legacy package) | @mediapipe/tasks-vision (unified API) | 2023 | Single package for all vision tasks. Older packages deprecated. |
| dat.gui for dev controls | lil-gui (maintained successor) | 2021+ | Same API, actively developed, smaller bundle. |
| Vite 6 | Vite 7 | 2025 | Current major. Breaking changes may affect plugin compat; vanilla-ts template unaffected. |
| Three.js r170 | Three.js r182 | Monthly releases | Use latest. Import patterns stable. |
| TypeScript 5.7 | TypeScript 5.9 | 2025 | Current stable. TS 6/7 (native Go port) in preview but not production-ready. |
| Browser UA sniffing for mobile | navigator.userAgentData + feature detection | 2023+ | Client Hints API is more reliable but Chrome/Edge only. Combine with feature detection. |

**Deprecated/outdated:**
- `@mediapipe/face_mesh`, `@mediapipe/hands`: Replaced by `@mediapipe/tasks-vision`. Do not use.
- `face-api.js`: Last updated 2020. Abandoned. Do not use.
- `dat.gui`: Replaced by `lil-gui`. Do not use.
- Webpack for new projects: Vite is strictly better for this use case.

## UX Recommendations (Claude's Discretion Areas)

### Permission Flow Design
- **Tone:** Friendly, concise, reassuring. Not corporate. Not overly casual.
- **Message:** "This experience uses your camera to detect your expressions and create a living particle aura around you. Your video never leaves your device."
- **Privacy assurance** is critical -- users are wary of camera access. State explicitly that video stays client-side.
- **Visual:** Dark background, centered layout, subtle animation (pulsing camera icon or soft gradient). The aesthetic sets the mood for the entire experience.
- **Button:** Large, centered "Start Experience" with a soft glow or pulse to draw attention.

### Error Screen Design
- **Tone:** Helpful, not blaming. "We couldn't access your camera" not "You denied camera access."
- **Always show:** A specific reason + a specific action the user can take.
- **Include:** A "Try Again" button where applicable (NotReadableError, timeout cases).
- **For permanent denial:** Show browser-specific instructions with screenshots/icons for the camera permission toggle in the address bar.

### Loading Experience Design
- **Show:** A horizontal progress bar with percentage. "Loading AI models... 67%"
- **Below progress:** A subtle rotating set of short phrases: "Setting up face detection...", "Preparing hand tracking...", "Almost ready..."
- **Background:** Start the camera feed playing (muted, mirrored) behind a semi-transparent dark overlay. This gives the user confidence the camera is working and builds anticipation.
- **Transition:** When loading completes, fade out the overlay to reveal the live feed.

### Mobile Gate Design
- **Tone:** Friendly, not dismissive. "This experience works best on a desktop computer with a webcam."
- **Do not block entirely.** Show the message with a soft suggestion, but include a "Continue Anyway" link for tablets with decent specs. The requirement says "best on desktop message" not "block mobile users."
- **Visual:** Same dark aesthetic as the permission screen. Include a simple desktop icon illustration.

### Webcam Feed Presentation
- **Fullscreen contained:** Video fills the viewport while maintaining 4:3 aspect ratio. Black bars (letterbox) on sides if needed. Use `object-fit: cover` for full bleed, or `object-fit: contain` for full visibility.
- **Recommendation:** Use `object-fit: cover` so the feed fills the screen. Users expect a mirror-like experience. Cropping the edges is acceptable.
- **Mirror:** Always mirror horizontally (`transform: scaleX(-1)`).
- **No UI chrome initially.** The live feed should feel immersive. Phase 2+ will add minimal overlays.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact MediaPipe model file sizes**
   - What we know: Combined face + hand models estimated at ~9MB total based on requirements. Face model is ~4-5MB, hand model is ~3-5MB.
   - What's unclear: Exact byte sizes depend on the model version fetched. Content-Length header from Google's CDN will provide this at runtime.
   - Recommendation: Implement progress tracking based on Content-Length header. If header is missing (unlikely from Google CDN but possible), fall back to indeterminate progress bar.

2. **COOP/COEP header necessity**
   - What we know: MediaPipe WASM may use SharedArrayBuffer for multi-threaded inference, which requires COOP/COEP headers. The Vite dev server can set these headers.
   - What's unclear: Whether current @mediapipe/tasks-vision actually requires SharedArrayBuffer, or if it falls back to single-threaded mode.
   - Recommendation: Start WITHOUT COOP/COEP headers. If MediaPipe throws errors about SharedArrayBuffer, add them via vite.config.ts. This avoids unnecessary cross-origin complexity.

3. **MediaPipe WASM CDN versioning**
   - What we know: Official docs use `@latest` in the CDN URL. The jsDelivr CDN hosts WASM files at versioned paths.
   - What's unclear: Whether `@latest` on jsDelivr always resolves correctly, or if a pinned version is safer.
   - Recommendation: Pin the WASM CDN URL to the same version as the installed npm package (e.g., `@0.10.32`). This prevents version mismatches between JS and WASM.

4. **Safari Permissions API support**
   - What we know: `navigator.permissions.query({ name: 'camera' })` may not be supported in all browsers. Firefox historically didn't support it for camera.
   - What's unclear: Current Safari 17+ and Firefox 130+ support status.
   - Recommendation: Wrap in try/catch and fall back to always showing the pre-prompt screen. The pre-prompt is good UX regardless of permission state.

## Sources

### Primary (HIGH confidence)
- [MDN getUserMedia docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) -- Error types, constraints syntax
- [MediaPipe Face Landmarker web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) -- Initialization pattern, configuration options
- [Three.js WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html) -- Alpha transparency, clear color
- [Vite Getting Started guide](https://vite.dev/guide/) -- Project creation, vanilla-ts template
- [Fetch download progress (javascript.info)](https://javascript.info/fetch-progress) -- ReadableStream progress tracking pattern

### Secondary (MEDIUM confidence)
- [npm @mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) -- Version 0.10.32 confirmed via WebSearch
- [npm three](https://www.npmjs.com/package/three) -- Version 0.182.0 confirmed via WebSearch
- [npm vite](https://www.npmjs.com/package/vite) -- Version 7.3.1 confirmed via WebSearch
- [npm typescript](https://www.npmjs.com/package/typescript) -- Version 5.9.3 confirmed via WebSearch
- [addpipe.com getUserMedia errors](https://blog.addpipe.com/common-getusermedia-errors/) -- Browser-specific error name differences
- [Vite COOP/COEP GitHub issue](https://github.com/vitejs/vite/issues/3909) -- Header configuration pattern

### Tertiary (LOW confidence)
- MediaPipe model exact file sizes -- estimated from project research, not verified with HEAD requests
- COOP/COEP necessity for current MediaPipe version -- needs runtime verification
- Safari Permissions API camera support -- browser support evolves rapidly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified via npm WebSearch; APIs are stable web standards
- Architecture: HIGH -- patterns are established (getUserMedia, Three.js overlay, Fetch progress are all well-documented)
- Pitfalls: HIGH -- getUserMedia error handling and MediaPipe loading are well-documented problem areas
- UX recommendations: MEDIUM -- based on best practices research and standard patterns, but design preferences are subjective

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days -- stack is stable, versions may bump but patterns won't change)
