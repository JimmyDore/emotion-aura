import './style.css';
import { SceneManager } from './scene/SceneManager.ts';

/**
 * Entry point for Emotion Aura.
 *
 * This is a skeleton that proves the Three.js scene works.
 * Plan 01-03 will refactor this into the full 3-screen orchestration flow.
 */

let sceneManager: SceneManager | null = null;
let statsInstance: { dom: HTMLElement; begin: () => void; end: () => void } | null = null;
let rafId = 0;

async function init(): Promise<void> {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas #scene not found in DOM');
  }

  sceneManager = new SceneManager(canvas);

  // Dynamic import for stats.js (dev tool, avoids verbatimModuleSyntax issues with export=)
  const StatsModule = await import('stats.js');
  const Stats = StatsModule.default;
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '0';
  stats.dom.style.left = '0';
  stats.dom.style.zIndex = '100';
  document.body.appendChild(stats.dom);
  statsInstance = stats;

  // Single render loop (rAF pattern established here, used by all future phases)
  function loop(): void {
    stats.begin();
    sceneManager!.render();
    stats.end();
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err: unknown) => {
    console.error('Emotion Aura init failed:', err);
  });
});

// HMR cleanup: dispose old renderer and stats to prevent WebGL context leaks
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId);

    if (sceneManager) {
      sceneManager.dispose();
      sceneManager = null;
    }

    if (statsInstance) {
      statsInstance.dom.remove();
      statsInstance = null;
    }
  });
}
