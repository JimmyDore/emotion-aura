import type { LoadProgress } from '../core/types.ts';

/**
 * Model download progress screen.
 * Shows a progress bar that updates in real-time as models are fetched.
 */
export class LoadingScreen {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private readonly progressFill: HTMLDivElement;
  private readonly percentText: HTMLSpanElement;
  private readonly labelText: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Root element
    this.element = document.createElement('div');
    this.element.className = 'screen loading-screen animate-fade-in';

    // Heading
    const heading = document.createElement('h2');
    heading.textContent = 'Loading AI Models...';
    this.element.appendChild(heading);

    // Progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    // Progress bar track
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    // Progress bar fill
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'progress-fill';
    this.progressFill.style.width = '0%';
    progressBar.appendChild(this.progressFill);
    progressContainer.appendChild(progressBar);

    // Label row: status text on left, percent on right
    const labelRow = document.createElement('div');
    labelRow.className = 'progress-label';

    this.labelText = document.createElement('span');
    this.labelText.textContent = 'Preparing...';

    this.percentText = document.createElement('span');
    this.percentText.textContent = '0%';

    labelRow.appendChild(this.labelText);
    labelRow.appendChild(this.percentText);
    progressContainer.appendChild(labelRow);

    this.element.appendChild(progressContainer);
  }

  /** Append the screen to the container and make it visible. */
  show(): void {
    this.container.appendChild(this.element);
  }

  /**
   * Hide the screen with a fade-out transition, then remove from DOM.
   */
  hide(): void {
    // Remove animation fill-mode that overrides inline opacity
    this.element.classList.remove('animate-fade-in');
    this.element.style.opacity = '1';

    // Force reflow so the browser registers opacity:1 before transitioning to 0
    void this.element.offsetHeight;

    this.element.style.transition = 'opacity 0.3s ease';
    this.element.style.opacity = '0';
    this.element.addEventListener(
      'transitionend',
      () => {
        this.element.remove();
        // Reset for potential re-show
        this.element.style.opacity = '';
        this.element.style.transition = '';
      },
      { once: true },
    );
  }

  /**
   * Update the progress bar, percentage text, and status label.
   */
  updateProgress(progress: LoadProgress): void {
    this.progressFill.style.width = `${progress.percent}%`;
    this.percentText.textContent = `${progress.percent}%`;
    this.labelText.textContent = progress.label;
  }
}

export default LoadingScreen;
