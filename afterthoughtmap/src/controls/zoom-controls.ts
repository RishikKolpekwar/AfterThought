import type SceneView from '@arcgis/core/views/SceneView';
import type Camera from '@arcgis/core/Camera';
import { zoomIn, zoomOut, resetCamera } from '../scene/camera-utils.js';

export class ZoomControls {
  private el: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private view: SceneView,
    private initialCamera: Camera,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'gc-zoom';

    this.el.innerHTML = `
      <button class="gc-zoom__btn" data-action="in" title="Zoom in" aria-label="Zoom in">+</button>
      <button class="gc-zoom__btn" data-action="reset" title="Reset view" aria-label="Reset view">&#8962;</button>
      <button class="gc-zoom__btn" data-action="out" title="Zoom out" aria-label="Zoom out">&minus;</button>
    `;

    this.el.addEventListener('click', this.handleClick);
    container.appendChild(this.el);
  }

  private handleClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'in') zoomIn(this.view);
    else if (action === 'out') zoomOut(this.view);
    else if (action === 'reset') resetCamera(this.view, this.initialCamera);
  };

  destroy(): void {
    this.el.removeEventListener('click', this.handleClick);
    this.el.remove();
  }
}
