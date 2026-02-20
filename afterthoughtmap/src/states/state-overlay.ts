import type { ErrorType } from '../types/index.js';

const ERROR_MESSAGES: Record<ErrorType, { title: string; detail: string }> = {
  network: {
    title: 'Connection Error',
    detail: 'Unable to load the scene. Check your internet connection and try again.',
  },
  auth: {
    title: 'Authentication Error',
    detail: 'Invalid or missing API key. Please provide a valid ArcGIS API key.',
  },
  webgl: {
    title: 'WebGL Not Supported',
    detail: 'Your browser or device does not support WebGL, which is required for 3D scenes.',
  },
  scene: {
    title: 'Scene Error',
    detail: 'The scene could not be loaded. It may be invalid or unavailable.',
  },
  unknown: {
    title: 'Something Went Wrong',
    detail: 'An unexpected error occurred. Please refresh and try again.',
  },
};

export class StateOverlay {
  private el: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'gc-overlay';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    container.appendChild(this.el);
  }

  showLoading(): void {
    this.el.innerHTML = `
      <div class="gc-overlay__content">
        <div class="gc-overlay__spinner" aria-label="Loading scene"></div>
        <p class="gc-overlay__text">Loading 3D scene&hellip;</p>
      </div>
    `;
    this.el.classList.add('gc-overlay--visible');
  }

  showError(type: ErrorType = 'unknown'): void {
    const msg = ERROR_MESSAGES[type];
    this.el.innerHTML = `
      <div class="gc-overlay__content gc-overlay__content--error">
        <div class="gc-overlay__icon" aria-hidden="true">&#9888;</div>
        <h2 class="gc-overlay__title">${msg.title}</h2>
        <p class="gc-overlay__text">${msg.detail}</p>
      </div>
    `;
    this.el.classList.add('gc-overlay--visible');
  }

  showEmpty(): void {
    this.el.innerHTML = `
      <div class="gc-overlay__content">
        <p class="gc-overlay__text">No layers found in this scene.</p>
      </div>
    `;
    this.el.classList.add('gc-overlay--visible');
  }

  hide(): void {
    this.el.classList.remove('gc-overlay--visible');
    this.el.innerHTML = '';
  }

  destroy(): void {
    this.el.remove();
  }
}
