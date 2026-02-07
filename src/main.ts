import './style.css';

import { SceneManager } from './scene/SceneManager.ts';
import { CameraManager } from './camera/CameraManager.ts';
import { ModelLoader } from './ml/ModelLoader.ts';
import { PermissionScreen } from './ui/PermissionScreen.ts';
import { LoadingScreen } from './ui/LoadingScreen.ts';
import { ErrorScreen } from './ui/ErrorScreen.ts';
import { MobileGate } from './ui/MobileGate.ts';
import { FaceDetector } from './ml/FaceDetector.ts';
import { HandDetector } from './ml/HandDetector.ts';
import { EmotionClassifier } from './ml/EmotionClassifier.ts';
import { EmotionState } from './state/EmotionState.ts';
import { EmotionOverlay } from './ui/EmotionOverlay.ts';
import { ParticleSystem } from './particles/ParticleSystem.ts';
import { FaceLandmarkTracker } from './particles/FaceLandmarkTracker.ts';
import { QualityScaler } from './particles/QualityScaler.ts';
import { blendProfiles } from './particles/EmotionProfile.ts';
import { classifyGesture, getPalmCenter } from './ml/GestureClassifier.ts';
import { GestureState } from './state/GestureState.ts';
import { GestureOverlay } from './ui/GestureOverlay.ts';
import { WASM_CDN, SPAWN_RATE_BASE, PARTICLE_SIZE_BASE, PARTICLE_LIFETIME_BASE, GESTURE_INFLUENCE_PX, FORCE_PUSH_STRENGTH, FORCE_ATTRACT_STRENGTH, FORCE_PINCH_STRENGTH } from './core/constants.ts';
import type { CameraError, GestureType } from './core/types.ts';
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
let handDetector: HandDetector | null = null;
let emotionOverlay: EmotionOverlay | null = null;
let particleSystem: ParticleSystem | null = null;
let qualityScaler: QualityScaler | null = null;
let gestureOverlay: GestureOverlay | null = null;
let handAura: HTMLDivElement | null = null;
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

  // Initialize hand detection from pre-downloaded model
  handDetector = new HandDetector();
  await handDetector.init(modelLoader.getHandModelBuffer()!, WASM_CDN);

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

  // Gesture pipeline
  const gestureState = new GestureState();
  gestureOverlay = new GestureOverlay(app);

  // Hand aura: positioned div showing force field radius
  handAura = document.createElement('div');
  handAura.className = 'hand-aura';
  app.appendChild(handAura);

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

  // Track video frame changes for staggered inference
  let lastVideoTime = -1;
  let inferenceToggle = false;

  // Render loop with emotion detection + particle pipeline
  function animate(): void {
    stats.begin();

    // Track time for particle system
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.05); // Cap dt to prevent spiral on lag
    lastTime = now;

    // Aspect ratio (needed by both gesture coords and face landmarks)
    const aspect = window.innerWidth / window.innerHeight;

    // Staggered inference: alternate face/hand detection on new video frames.
    // Face runs on even frames, hand runs on odd frames.
    // This keeps per-frame ML cost at one model for consistent 30fps.
    const isNewVideoFrame = video!.currentTime !== lastVideoTime;

    if (isNewVideoFrame) {
      lastVideoTime = video!.currentTime;

      if (!inferenceToggle) {
        // FACE frame (even)
        const result = faceDetector!.detect(video!);
        if (result !== null) {
          if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
            const rawScores = emotionClassifier.classify(result.faceBlendshapes[0].categories);
            emotionState.update(rawScores);
            lastFaceLandmarks = result.faceLandmarks?.[0];
          } else {
            // Face lost
            const gestureNow = gestureState.getCurrent();
            if (gestureNow.active && gestureNow.handPosition) {
              // Occlusion: hand present + face lost = freeze last emotion (don't decay)
              // Keep lastFaceLandmarks as-is (don't set to undefined)
            } else {
              emotionState.decayToNeutral();
              lastFaceLandmarks = undefined;
            }
          }
        }
      } else {
        // HAND frame (odd)
        const handResultData = handDetector!.detect(video!);
        if (handResultData !== null && handResultData.landmarks.length > 0) {
          const landmarks = handResultData.landmarks[0];
          const rawGesture = classifyGesture(landmarks);
          const palmCenter = getPalmCenter(landmarks);

          // Convert palm center to scene coordinates (same as FaceLandmarkTracker.toScene)
          const palmSceneX = -(palmCenter.x * 2 - 1) * aspect;
          const palmSceneY = -(palmCenter.y * 2 - 1);

          gestureState.update(rawGesture, true, { x: palmSceneX, y: palmSceneY }, dt);
        } else {
          gestureState.update('none', false, null, dt);
        }
      }

      inferenceToggle = !inferenceToggle;
    }

    // Update overlay every frame (reads smoothed state)
    emotionOverlay!.update(emotionState.getCurrent());

    // Read gesture state once per frame (used in spawn, force field, and UI sections)
    const gestureResult = gestureState.getCurrent();

    // ── Particle spawning and updating ─────────────────────────────
    const currentEmotion = emotionState.getCurrent();
    const profile = blendProfiles(currentEmotion.scores);

    // Get face spawn points (ears + center) in scene coordinates
    const facePoints = faceLandmarkTracker.update(lastFaceLandmarks, aspect);

    if (facePoints && currentEmotion.faceDetected) {
      particleSystem!.setSpawnCenter(facePoints.center.x, facePoints.center.y);

      // Spawn particles based on emotion profile and intensity
      const intensity = currentEmotion.intensity;
      const spawnRate = SPAWN_RATE_BASE * profile.spawnRateMultiplier * (0.3 + 0.7 * intensity);
      const particlesToSpawn = spawnRate * dt;

      // Two spawn sources: left ear and right ear
      const spawnSources = [facePoints.leftEar, facePoints.rightEar];

      // Fractional spawning: accumulate and spawn whole particles
      spawnAccumulator += particlesToSpawn;
      while (spawnAccumulator >= 1) {
        spawnAccumulator -= 1;

        // Alternate between left and right ear
        const source = spawnSources[Math.random() < 0.5 ? 0 : 1];

        // Direction: outward from face center through spawn point
        const dx = source.x - facePoints.center.x;
        const dy = source.y - facePoints.center.y;
        const outwardAngle = Math.atan2(dy, dx);

        // Determine base angle: outward from ear + emotion direction bias
        const dirLen = Math.sqrt(
          profile.direction[0] * profile.direction[0] +
          profile.direction[1] * profile.direction[1],
        );

        let baseAngle: number;
        if (dirLen < 0.001) {
          // Radial: use outward from ear direction
          baseAngle = outwardAngle;
        } else {
          // Blend outward direction with emotion direction
          const emotionAngle = Math.atan2(profile.direction[1], profile.direction[0]);
          baseAngle = outwardAngle * 0.6 + emotionAngle * 0.4;
        }

        const angle = baseAngle + (Math.random() - 0.5) * profile.spread;
        // When gesture active: reduce initial velocity so force fields dominate
        const gestureActive = gestureResult.active;
        const speedScale = gestureActive ? 0.2 : 1.0;
        const speed = profile.speed * (0.5 + Math.random() * 0.5) * (0.5 + intensity * 0.5) * speedScale;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Pick random color from profile palette
        const colorIdx = Math.floor(Math.random() * profile.colors.length);
        const [r, g, b] = profile.colors[colorIdx];

        // Scale size and lifetime by intensity
        const size = PARTICLE_SIZE_BASE * profile.sizeMultiplier * (0.5 + Math.random() * 0.5) * (0.7 + intensity * 0.3);
        const lifetime = PARTICLE_LIFETIME_BASE * profile.lifetimeMultiplier * (0.8 + Math.random() * 0.4);

        // Spawn at ear position with slight random offset
        const offsetX = (Math.random() - 0.5) * 0.1;
        const offsetY = (Math.random() - 0.5) * 0.1;

        particleSystem!.spawn(
          source.x + offsetX, source.y + offsetY,
          vx, vy,
          r, g, b,
          size, lifetime,
        );
      }
    } else {
      faceLandmarkTracker.reset();
    }

    // ── Gesture force fields ──────────────────────────────────────────
    if (gestureResult.active && gestureResult.handPosition) {
      // Determine force strength based on gesture type
      const forceStrengths: Record<GestureType, number> = {
        push: FORCE_PUSH_STRENGTH,
        attract: FORCE_ATTRACT_STRENGTH,
        pinch: FORCE_PINCH_STRENGTH,
        none: 0,
      };
      const baseStrength = forceStrengths[gestureResult.gesture];
      const effectiveStrength = baseStrength * gestureResult.strength; // strength decays on hand loss

      // Influence radius: convert pixels to scene units
      const influenceRadius = (GESTURE_INFLUENCE_PX / window.innerHeight) * 2.0;

      particleSystem!.getPool().applyForceField(
        gestureResult.handPosition.x,
        gestureResult.handPosition.y,
        gestureResult.gesture,
        influenceRadius,
        effectiveStrength,
        dt,
      );
    }

    // Update particle system (physics + GPU buffer sync)
    particleSystem!.update(dt, now);

    // Update gesture overlay
    gestureOverlay!.update(gestureResult.gesture);

    // Update hand aura position and visibility
    if (handAura) {
      if (gestureResult.active && gestureResult.handPosition) {
        // Convert scene coords back to screen coords for DOM positioning
        // Scene: x=[-aspect, aspect], y=[-1, 1]. Screen: [0, viewportWidth], [0, viewportHeight]
        const screenX = (1 - (gestureResult.handPosition.x / aspect + 1) / 2) * window.innerWidth;
        const screenY = (1 - (gestureResult.handPosition.y + 1) / 2) * window.innerHeight;
        const auraSizePx = GESTURE_INFLUENCE_PX * 2; // diameter

        handAura.style.left = `${screenX}px`;
        handAura.style.top = `${screenY}px`;
        handAura.style.width = `${auraSizePx}px`;
        handAura.style.height = `${auraSizePx}px`;
        handAura.classList.add('hand-aura--visible');
      } else {
        handAura.classList.remove('hand-aura--visible');
      }
    }

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

    if (handDetector) {
      handDetector.close();
      handDetector = null;
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

    if (gestureOverlay) {
      gestureOverlay.dispose();
      gestureOverlay = null;
    }

    if (handAura) {
      handAura.remove();
      handAura = null;
    }

    if (statsInstance) {
      statsInstance.dom.remove();
      statsInstance = null;
    }
  });
}
