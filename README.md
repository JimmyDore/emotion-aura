# Emotion Aura

Real-time web app that detects facial emotions through your webcam and visualizes them as a 3D aura.

**[Live demo](https://emotionaura.jimmydore.fr)**

## Features

- **Real-time face detection** -- Facial analysis via MediaPipe FaceLandmarker, running entirely in the browser
- **Emotion classification** -- 5 emotions detected (happy, sad, angry, surprised, neutral) from facial blendshapes, based on the FACS (Facial Action Coding System)
- **Temporal smoothing** -- Exponential moving average (EMA) for fluid transitions between emotions, with accelerated decay when the face disappears
- **3D overlay** -- Three.js scene composited over the mirrored webcam feed
- **Emotion HUD** -- Real-time display of the dominant emotion and all scores
- **Error handling** -- Dedicated screens for camera permissions, model loading, and mobile detection

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Build | Vite |
| 3D | Three.js |
| ML / Vision | MediaPipe Tasks Vision (FaceLandmarker, WASM) |
| Deployment | GitHub Actions + rsync to VPS with nginx |

## Architecture

```
src/
├── main.ts                 # Orchestration and render loop
├── camera/CameraManager    # Webcam access (getUserMedia)
├── ml/
│   ├── FaceDetector        # MediaPipe face detection
│   ├── EmotionClassifier   # Emotion classification from blendshapes
│   └── ModelLoader         # Model download and caching
├── scene/SceneManager      # Three.js rendering
├── state/EmotionState      # EMA score smoothing
├── ui/                     # Screens (permission, loading, error, mobile gate, overlay)
└── core/                   # Types and constants (thresholds, FACS weights)
```

## Development

```bash
npm install
npm run dev
```

Production build (`npm run build`) outputs static files to `dist/`. Every push to `main` triggers automatic deployment via GitHub Actions.
