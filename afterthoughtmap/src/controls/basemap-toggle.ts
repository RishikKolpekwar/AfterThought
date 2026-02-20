import Basemap from '@arcgis/core/Basemap.js';
import type SceneView from '@arcgis/core/views/SceneView';
import type { BasemapOption } from '../types/index.js';

const DEFAULT_BASEMAPS: BasemapOption[] = [
  { id: 'topo-3d', label: 'Topographic' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'dark-gray-vector', label: 'Dark Gray' },
];

export class BasemapToggle {
  private el: HTMLDivElement;
  private select: HTMLSelectElement;

  constructor(
    container: HTMLElement,
    private view: SceneView,
    basemaps?: BasemapOption[],
  ) {
    const options = basemaps ?? DEFAULT_BASEMAPS;

    this.el = document.createElement('div');
    this.el.className = 'gc-basemap';

    const label = document.createElement('label');
    label.className = 'gc-basemap__label';
    label.textContent = 'Basemap';

    this.select = document.createElement('select');
    this.select.className = 'gc-basemap__select';
    this.select.setAttribute('aria-label', 'Select basemap');

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.id;
      option.textContent = opt.label;
      this.select.appendChild(option);
    }

    this.select.addEventListener('change', this.handleChange);

    label.appendChild(this.select);
    this.el.appendChild(label);
    container.appendChild(this.el);
  }

  setBasemap(id: string): void {
    this.select.value = id;
    this.applyBasemap(id);
  }

  private handleChange = (): void => {
    this.applyBasemap(this.select.value);
  };

  private applyBasemap(id: string): void {
    const basemap = Basemap.fromId(id);
    if (basemap && this.view.map) {
      this.view.map.basemap = basemap;
    }
  }

  destroy(): void {
    this.select.removeEventListener('change', this.handleChange);
    this.el.remove();
  }
}
