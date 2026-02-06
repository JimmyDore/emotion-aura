import type { CameraError } from '../core/types.ts';

/** Error types where the user can meaningfully retry. */
const RECOVERABLE_TYPES: ReadonlySet<CameraError['type']> = new Set(['in-use', 'unknown']);

/**
 * Error screen with specific messages and recovery guidance.
 * Displays different content based on the CameraError type.
 * Shows a "Try Again" button only for recoverable errors.
 */
export class ErrorScreen {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private readonly messageEl: HTMLParagraphElement;
  private readonly hintEl: HTMLParagraphElement;
  private readonly retryButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Root element
    this.element = document.createElement('div');
    this.element.className = 'screen error-screen animate-fade-in';

    // Warning icon (SVG triangle with exclamation)
    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    this.element.appendChild(icon);

    // Heading
    const heading = document.createElement('h2');
    heading.textContent = 'Something went wrong';
    this.element.appendChild(heading);

    // Error message (dynamic)
    this.messageEl = document.createElement('p');
    this.messageEl.className = 'error-message';
    this.element.appendChild(this.messageEl);

    // Recovery hint (dynamic)
    this.hintEl = document.createElement('p');
    this.hintEl.className = 'error-hint';
    this.element.appendChild(this.hintEl);

    // Try Again button (hidden by default, only shown for recoverable errors)
    this.retryButton = document.createElement('button');
    this.retryButton.className = 'btn-secondary';
    this.retryButton.type = 'button';
    this.retryButton.textContent = 'Try Again';
    this.retryButton.style.display = 'none';
    this.element.appendChild(this.retryButton);
  }

  /**
   * Show the error screen populated with error-specific content.
   * Only shows "Try Again" for recoverable error types (in-use, unknown).
   */
  show(error: CameraError): void {
    this.messageEl.textContent = error.message;
    this.hintEl.textContent = error.recoveryHint;
    this.retryButton.style.display = RECOVERABLE_TYPES.has(error.type) ? '' : 'none';
    this.container.appendChild(this.element);
  }

  /** Remove the error screen from the DOM. */
  hide(): void {
    this.element.remove();
  }

  /** Register a callback for when the user clicks "Try Again". */
  onRetry(callback: () => void): void {
    this.retryButton.addEventListener('click', callback);
  }
}

export default ErrorScreen;
