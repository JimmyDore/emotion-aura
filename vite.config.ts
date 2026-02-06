import { defineConfig } from 'vite';

export default defineConfig({
  // Minimal config -- Vite works out of the box for vanilla-ts.
  // COOP/COEP headers intentionally omitted:
  // Add only if MediaPipe throws SharedArrayBuffer errors at runtime.
});
