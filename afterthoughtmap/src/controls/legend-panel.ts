import Legend from '@arcgis/core/widgets/Legend.js';
import type SceneView from '@arcgis/core/views/SceneView';

export class LegendPanel {
  private el: HTMLDivElement;
  private legend: Legend | null = null;

  constructor(container: HTMLElement, view: SceneView) {
    this.el = document.createElement('div');
    this.el.className = 'gc-legend';

    const heading = document.createElement('h3');
    heading.className = 'gc-legend__heading';
    heading.textContent = 'Legend';
    this.el.appendChild(heading);

    const legendContainer = document.createElement('div');
    legendContainer.className = 'gc-legend__content';
    this.el.appendChild(legendContainer);

    this.legend = new Legend({ view, container: legendContainer });
    container.appendChild(this.el);
  }

  destroy(): void {
    this.legend?.destroy();
    this.el.remove();
  }
}
