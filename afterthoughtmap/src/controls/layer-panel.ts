import type SceneView from '@arcgis/core/views/SceneView';
import type { LayerInfo } from '../types/index.js';

export class LayerPanel {
  private el: HTMLDivElement;
  private layers: LayerInfo[] = [];

  constructor(
    container: HTMLElement,
    private view: SceneView,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'gc-layers';

    const heading = document.createElement('h3');
    heading.className = 'gc-layers__heading';
    heading.textContent = 'Layers';
    this.el.appendChild(heading);

    this.buildLayerList();
    this.el.addEventListener('change', this.handleToggle);
    container.appendChild(this.el);
  }

  private buildLayerList(): void {
    const list = document.createElement('ul');
    list.className = 'gc-layers__list';

    const allLayers = this.view.map?.allLayers;
    if (!allLayers) return;

    allLayers.forEach((layer) => {
      if (layer.type === 'group' || !layer.title) return;

      const info: LayerInfo = {
        id: layer.id,
        title: layer.title,
        visible: layer.visible,
        type: layer.type,
      };
      this.layers.push(info);

      const li = document.createElement('li');
      li.className = 'gc-layers__item';

      const label = document.createElement('label');
      label.className = 'gc-layers__label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'gc-layers__checkbox';
      checkbox.checked = layer.visible;
      checkbox.dataset.layerId = layer.id;

      const text = document.createElement('span');
      text.textContent = layer.title;

      label.appendChild(checkbox);
      label.appendChild(text);
      li.appendChild(label);
      list.appendChild(li);
    });

    this.el.appendChild(list);
  }

  toggleLayer(titleOrId: string, visible: boolean): void {
    const layer = this.view.map?.allLayers?.find(
      (l) => l.title === titleOrId || l.id === titleOrId,
    );
    if (layer) {
      layer.visible = visible;
      const checkbox = this.el.querySelector<HTMLInputElement>(
        `[data-layer-id="${layer.id}"]`,
      );
      if (checkbox) checkbox.checked = visible;
    }
  }

  private handleToggle = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (!target.dataset.layerId) return;

    const layer = this.view.map?.allLayers?.find((l) => l.id === target.dataset.layerId);
    if (layer) {
      layer.visible = target.checked;
    }
  };

  destroy(): void {
    this.el.removeEventListener('change', this.handleToggle);
    this.el.remove();
  }
}
