/**
 * Mobile device detection gate.
 * Shows a "Best on Desktop" message on small/touch devices,
 * with a "Continue Anyway" escape hatch for tablet users.
 */
export class MobileGate {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private resolvePromise: (() => void) | null = null;

  /**
   * Detect whether the current device is likely a mobile/tablet.
   * Uses multiple heuristics and returns true if any match.
   */
  static isMobile(): boolean {
    // Method 1: Client Hints API (Chrome/Edge)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.userAgentData?.mobile === true) {
      return true;
    }

    // Method 2: Narrow viewport
    if (window.matchMedia('(max-width: 768px)').matches) {
      return true;
    }

    // Method 3: Touch-primary device with coarse pointer
    if (
      navigator.maxTouchPoints > 0 &&
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return true;
    }

    return false;
  }

  constructor(container: HTMLElement) {
    this.container = container;

    // Root element
    this.element = document.createElement('div');
    this.element.className = 'screen mobile-gate-screen animate-fade-in';

    // Desktop icon (SVG monitor)
    const icon = document.createElement('div');
    icon.className = 'permission-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
    this.element.appendChild(icon);

    // Heading
    const heading = document.createElement('h2');
    heading.textContent = 'Best on Desktop';
    this.element.appendChild(heading);

    // Message
    const message = document.createElement('p');
    message.textContent =
      'This experience uses your webcam and works best on a desktop computer with a larger screen.';
    this.element.appendChild(message);

    // Continue Anyway link-button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn-text';
    continueBtn.type = 'button';
    continueBtn.textContent = 'Continue Anyway';
    continueBtn.addEventListener('click', () => {
      if (this.resolvePromise) {
        this.resolvePromise();
        this.resolvePromise = null;
      }
    });
    this.element.appendChild(continueBtn);
  }

  /**
   * Show the mobile gate screen and wait for user to dismiss it.
   * Returns a promise that resolves when the user clicks "Continue Anyway".
   */
  show(): Promise<void> {
    this.container.appendChild(this.element);
    return new Promise<void>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /** Remove the screen from the DOM. */
  hide(): void {
    this.element.remove();
  }
}

export default MobileGate;
