import type SceneView from '@arcgis/core/views/SceneView';
import type Camera from '@arcgis/core/Camera';
import type { BasemapOption } from '../types/index.js';
import { ZoomControls } from './zoom-controls.js';
import { BasemapToggle } from './basemap-toggle.js';
import { LayerPanel } from './layer-panel.js';
import { LegendPanel } from './legend-panel.js';

export class ControlPanel {
  private el: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private body: HTMLDivElement;
  private zoomControls: ZoomControls;
  private basemapToggle: BasemapToggle;
  private layerPanel: LayerPanel;
  private legendPanel: LegendPanel;
  private collapsed = false;

  constructor(
    container: HTMLElement,
    view: SceneView,
    initialCamera: Camera,
    basemaps?: BasemapOption[],
  ) {
    this.el = document.createElement('div');
    this.el.className = 'gc-panel';

    // Toggle button (for mobile)
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'gc-panel__toggle';
    this.toggleBtn.setAttribute('aria-label', 'Toggle control panel');
    this.toggleBtn.innerHTML = '&#9776;';
    this.toggleBtn.addEventListener('click', this.handleToggle);
    this.el.appendChild(this.toggleBtn);

    // Panel body
    this.body = document.createElement('div');
    this.body.className = 'gc-panel__body';

    this.zoomControls = new ZoomControls(this.body, view, initialCamera);
    this.basemapToggle = new BasemapToggle(this.body, view, basemaps);
    this.layerPanel = new LayerPanel(this.body, view);
    this.legendPanel = new LegendPanel(this.body, view);

    this.el.appendChild(this.body);
    container.appendChild(this.el);
  }

  setBasemap(id: string): void {
    this.basemapToggle.setBasemap(id);
  }

  toggleLayer(titleOrId: string, visible: boolean): void {
    this.layerPanel.toggleLayer(titleOrId, visible);
  }

  private handleToggle = (): void => {
    this.collapsed = !this.collapsed;
    this.el.classList.toggle('gc-panel--collapsed', this.collapsed);
  };

  destroy(): void {
    this.toggleBtn.removeEventListener('click', this.handleToggle);
    this.zoomControls.destroy();
    this.basemapToggle.destroy();
    this.layerPanel.destroy();
    this.legendPanel.destroy();
    this.el.remove();
  }
}
