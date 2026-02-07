import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  // COOP/COEP headers intentionally omitted:
  // Add only if MediaPipe throws SharedArrayBuffer errors at runtime.
});
