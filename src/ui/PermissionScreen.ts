/**
 * Pre-prompt permission screen.
 * Explains camera usage and privacy before triggering getUserMedia.
 * Shown as the first screen in the startup flow.
 */
export class PermissionScreen {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Root element
    this.element = document.createElement('div');
    this.element.className = 'screen permission-screen animate-fade-in';

    // Camera icon
    const icon = document.createElement('div');
    icon.className = 'permission-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    this.element.appendChild(icon);

    // Heading
    const heading = document.createElement('h2');
    heading.textContent = 'Emotion Aura';
    this.element.appendChild(heading);

    // Description
    const description = document.createElement('p');
    description.textContent =
      'This experience uses your camera to detect your expressions and create a living particle aura around you.';
    this.element.appendChild(description);

    // Privacy note
    const privacy = document.createElement('p');
    privacy.className = 'privacy-note';
    privacy.textContent =
      'Your video never leaves your device. Everything runs locally in your browser.';
    this.element.appendChild(privacy);

    // Start button
    this.startButton = document.createElement('button');
    this.startButton.className = 'btn-primary animate-pulse';
    this.startButton.type = 'button';
    this.startButton.textContent = 'Start Experience';
    this.element.appendChild(this.startButton);
  }

  /** Append the screen to the container and make it visible. */
  show(): void {
    this.container.appendChild(this.element);
  }

  /** Remove the screen from the DOM. */
  hide(): void {
    this.element.remove();
  }

  /** Register a callback for when the user clicks "Start Experience". */
  onStart(callback: () => void): void {
    this.startButton.addEventListener('click', callback);
  }
}

export default PermissionScreen;
