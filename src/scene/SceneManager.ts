import * as THREE from 'three';
import { MAX_PIXEL_RATIO } from '../core/constants.ts';

/**
 * Manages the Three.js scene, renderer, and camera.
 *
 * Creates a transparent WebGL canvas overlay suitable for rendering
 * particles on top of a webcam video feed. The orthographic camera
 * maps to normalized device coordinates for 2D overlay work.
 *
 * Phase 3 will add particle geometry to the exposed `scene` property.
 */
export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly onResize: () => void;

  constructor(canvas: HTMLCanvasElement) {
    // Transparent WebGL renderer overlaid on the video feed
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    // Orthographic camera for 2D particle overlay
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -aspect, aspect, 1, -1, 0.1, 100
    );
    this.camera.position.z = 1;

    // Resize handler: keep renderer and camera in sync with viewport
    this.onResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      this.camera.left = -newAspect;
      this.camera.right = newAspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.onResize);
  }

  /** Render one frame. Called from the main render loop. */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Dispose all GPU resources and remove event listeners.
   * Called during HMR cleanup to prevent WebGL context leaks.
   */
  dispose(): void {
    window.removeEventListener('resize', this.onResize);

    // Traverse scene and dispose all geometries and materials
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
