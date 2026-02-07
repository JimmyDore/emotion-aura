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
import { ParticleSystem } from './particles/ParticleSystem.ts';
import { FaceLandmarkTracker } from './particles/FaceLandmarkTracker.ts';
import { QualityScaler } from './particles/QualityScaler.ts';
import { blendProfiles } from './particles/EmotionProfile.ts';
import { WASM_CDN, SPAWN_RATE_BASE, PARTICLE_SIZE_BASE, PARTICLE_LIFETIME_BASE } from './core/constants.ts';
import type { CameraError } from './core/types.ts';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

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
let particleSystem: ParticleSystem | null = null;
let qualityScaler: QualityScaler | null = null;
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

  // Particle system
  particleSystem = new ParticleSystem(sceneManager.scene);
  const faceLandmarkTracker = new FaceLandmarkTracker();
  qualityScaler = new QualityScaler(particleSystem.getPool());

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

  // Time tracking for particle system
  let lastTime = performance.now() / 1000;
  let spawnAccumulator = 0;

  // Last known face landmarks (persists across stale frames)
  let lastFaceLandmarks: NormalizedLandmark[] | undefined;

  // Render loop with emotion detection + particle pipeline
  function animate(): void {
    stats.begin();

    // Track time for particle system
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.05); // Cap dt to prevent spiral on lag
    lastTime = now;

    // Run face detection (returns null on stale frames)
    const result = faceDetector!.detect(video!);

    // Only update state when detection actually ran (new video frame).
    // Stale frames (result === null) are skipped to avoid false decay.
    if (result !== null) {
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const rawScores = emotionClassifier.classify(result.faceBlendshapes[0].categories);
        emotionState.update(rawScores);
        lastFaceLandmarks = result.faceLandmarks?.[0];
      } else {
        emotionState.decayToNeutral();
        lastFaceLandmarks = undefined;
      }
    }

    // Update overlay every frame (reads smoothed state)
    emotionOverlay!.update(emotionState.getCurrent());

    // ── Particle spawning and updating ─────────────────────────────
    const currentEmotion = emotionState.getCurrent();
    const profile = blendProfiles(currentEmotion.scores);

    // Get face position in scene coordinates
    const aspect = window.innerWidth / window.innerHeight;
    const facePos = faceLandmarkTracker.update(lastFaceLandmarks, aspect);

    if (facePos && currentEmotion.faceDetected) {
      particleSystem!.setSpawnCenter(facePos.x, facePos.y);

      // Spawn particles based on emotion profile and intensity
      const intensity = currentEmotion.intensity;
      const spawnRate = SPAWN_RATE_BASE * profile.spawnRateMultiplier * (0.3 + 0.7 * intensity);
      const particlesToSpawn = spawnRate * dt;

      // Fractional spawning: accumulate and spawn whole particles
      spawnAccumulator += particlesToSpawn;
      while (spawnAccumulator >= 1) {
        spawnAccumulator -= 1;

        // Determine direction: zero-length means radial outward from center
        const dirLen = Math.sqrt(
          profile.direction[0] * profile.direction[0] +
          profile.direction[1] * profile.direction[1],
        );

        let baseAngle: number;
        if (dirLen < 0.001) {
          // Radial outward: random angle
          baseAngle = Math.random() * Math.PI * 2;
        } else {
          baseAngle = Math.atan2(profile.direction[1], profile.direction[0]);
        }

        const angle = baseAngle + (Math.random() - 0.5) * profile.spread;
        const speed = profile.speed * (0.5 + Math.random() * 0.5) * (0.5 + intensity * 0.5);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Pick random color from profile palette
        const colorIdx = Math.floor(Math.random() * profile.colors.length);
        const [r, g, b] = profile.colors[colorIdx];

        // Scale size and lifetime by intensity
        const size = PARTICLE_SIZE_BASE * profile.sizeMultiplier * (0.5 + Math.random() * 0.5) * (0.7 + intensity * 0.3);
        const lifetime = PARTICLE_LIFETIME_BASE * profile.lifetimeMultiplier * (0.8 + Math.random() * 0.4);

        // Spawn at face position with slight random offset
        const offsetX = (Math.random() - 0.5) * 0.15;
        const offsetY = (Math.random() - 0.5) * 0.15;

        particleSystem!.spawn(
          facePos.x + offsetX, facePos.y + offsetY,
          vx, vy,
          r, g, b,
          size, lifetime,
        );
      }
    } else {
      faceLandmarkTracker.reset();
    }

    // Update particle system (physics + GPU buffer sync)
    particleSystem!.update(dt, now);

    // Quality scaling
    qualityScaler!.update(dt);

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

    if (particleSystem) {
      particleSystem.dispose();
      particleSystem = null;
    }

    if (qualityScaler) {
      qualityScaler.dispose();
      qualityScaler = null;
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
