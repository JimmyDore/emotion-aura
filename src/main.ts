import './style.css';

import { SceneManager } from './scene/SceneManager.ts';
import { CameraManager } from './camera/CameraManager.ts';
import { ModelLoader } from './ml/ModelLoader.ts';
import { PermissionScreen } from './ui/PermissionScreen.ts';
import { LoadingScreen } from './ui/LoadingScreen.ts';
import { ErrorScreen } from './ui/ErrorScreen.ts';
import { MobileGate } from './ui/MobileGate.ts';
import { FaceDetector } from './ml/FaceDetector.ts';
import { EmotionClassifier } from './ml/EmotionClassifier.ts';
import { EmotionState } from './state/EmotionState.ts';
import { EmotionOverlay } from './ui/EmotionOverlay.ts';
import { WASM_CDN } from './core/constants.ts';
import type { CameraError } from './core/types.ts';

/**
 * Emotion Aura -- main orchestration.
 *
 * Startup flow:
 *   1. Mobile gate  (if narrow/touch device)
 *   2. Permission screen  (explain camera usage, wait for user)
 *   3. Loading + Camera  (parallel: download models & request camera)
 *   4. Live experience  (mirrored webcam + Three.js overlay + Stats)
 */

let sceneManager: SceneManager | null = null;
let cameraManager: CameraManager | null = null;
let faceDetector: FaceDetector | null = null;
let emotionOverlay: EmotionOverlay | null = null;
let statsInstance: { dom: HTMLElement; begin: () => void; end: () => void } | null = null;
let rafId = 0;

async function startApp(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) {
    throw new Error('#app container not found in DOM');
  }

  // ── a. MOBILE CHECK ──────────────────────────────────────────────
  if (MobileGate.isMobile()) {
    const gate = new MobileGate(app);
    await gate.show(); // resolves when user clicks "Continue Anyway"
    gate.hide();
  }

  // ── b. PERMISSION SCREEN ─────────────────────────────────────────
  const permissionScreen = new PermissionScreen(app);
  permissionScreen.show();

  await new Promise<void>((resolve) => {
    permissionScreen.onStart(() => resolve());
  });

  permissionScreen.hide();

  // ── c. LOADING + CAMERA (parallel) ───────────────────────────────
  await loadAndConnect(app);
}

/**
 * Loading phase: show progress UI, request camera + download models in
 * parallel. On failure, show error screen (with optional retry).
 */
async function loadAndConnect(app: HTMLElement): Promise<void> {
  const loadingScreen = new LoadingScreen(app);
  loadingScreen.show();

  cameraManager = new CameraManager();
  const modelLoader = new ModelLoader();

  try {
    await Promise.all([
      cameraManager.requestAccess(),
      modelLoader.loadAll((progress) => loadingScreen.updateProgress(progress)),
    ]);
  } catch (err: unknown) {
    loadingScreen.hide();

    // Determine error details
    const cameraError: CameraError = isCameraError(err)
      ? err
      : {
          type: 'unknown',
          message: 'Failed to initialise',
          recoveryHint:
            'Model download or camera access failed. Check your connection and try again.',
        };

    const errorScreen = new ErrorScreen(app);
    errorScreen.show(cameraError);

    // Wire retry for recoverable errors -- restarts the loading phase
    errorScreen.onRetry(() => {
      errorScreen.hide();
      loadAndConnect(app).catch((retryErr: unknown) => {
        console.error('Retry failed:', retryErr);
      });
    });

    return; // Stop here; retry callback re-enters this function
  }

  loadingScreen.hide();

  // Initialize face detection from pre-downloaded model
  faceDetector = new FaceDetector();
  await faceDetector.init(modelLoader.getFaceModelBuffer()!, WASM_CDN);

  // ── d. LIVE EXPERIENCE ───────────────────────────────────────────
  const video = document.getElementById('webcam') as HTMLVideoElement | null;
  if (!video) {
    throw new Error('Video #webcam not found in DOM');
  }

  await cameraManager.attachToVideo(video);
  video.style.display = 'block';
  video.style.transform = 'scaleX(-1)';

  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas #scene not found in DOM');
  }

  sceneManager = new SceneManager(canvas);

  // Emotion detection pipeline
  const emotionClassifier = new EmotionClassifier();
  const emotionState = new EmotionState();
  emotionOverlay = new EmotionOverlay(app);

  // Dynamic import for stats.js (dev tool; avoids verbatimModuleSyntax conflict)
  const StatsModule = await import('stats.js');
  const Stats = StatsModule.default;
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '0';
  stats.dom.style.left = '0';
  stats.dom.style.zIndex = '100';
  document.body.appendChild(stats.dom);
  statsInstance = stats;

  // Render loop with emotion detection pipeline
  function animate(): void {
    stats.begin();

    // Run face detection (returns null on stale frames)
    const result = faceDetector!.detect(video!);

    // Only update state when detection actually ran (new video frame).
    // Stale frames (result === null) are skipped to avoid false decay.
    if (result !== null) {
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const rawScores = emotionClassifier.classify(result.faceBlendshapes[0].categories);
        emotionState.update(rawScores);
      } else {
        emotionState.decayToNeutral();
      }
    }

    // Update overlay every frame (reads smoothed state)
    emotionOverlay!.update(emotionState.getCurrent());

    sceneManager!.render();
    stats.end();
    rafId = requestAnimationFrame(animate);
  }
  animate();
}

/** Type-guard: check if an unknown error looks like a CameraError. */
function isCameraError(err: unknown): err is CameraError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    'recoveryHint' in err
  );
}

// ── Bootstrap ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startApp().catch((err: unknown) => {
    console.error('Emotion Aura startup failed:', err);
  });
});

// ── e. HMR CLEANUP ──────────────────────────────────────────────────
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId);

    if (sceneManager) {
      sceneManager.dispose();
      sceneManager = null;
    }

    if (cameraManager) {
      cameraManager.stop();
      cameraManager = null;
    }

    if (faceDetector) {
      faceDetector.close();
      faceDetector = null;
    }

    if (emotionOverlay) {
      emotionOverlay.dispose();
      emotionOverlay = null;
    }

    if (statsInstance) {
      statsInstance.dom.remove();
      statsInstance = null;
    }
  });
}
