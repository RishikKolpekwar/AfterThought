import type SceneView from '@arcgis/core/views/SceneView';
import type Camera from '@arcgis/core/Camera';
import type { GridCaseViewerOptions, ViewerState } from './types/index.js';
import { loadScene, SceneLoadError } from './scene/scene-loader.js';
import { resetCamera } from './scene/camera-utils.js';
import { StateOverlay } from './states/state-overlay.js';
import { ControlPanel } from './controls/control-panel.js';
import './styles/gridcase.css';

export class GridCaseViewer {
  private root: HTMLElement;
  private viewContainer: HTMLDivElement;
  private overlay: StateOverlay;
  private controlPanel: ControlPanel | null = null;
  private view: SceneView | null = null;
  private initialCamera: Camera | null = null;
  private state: ViewerState = 'idle';

  constructor(
    container: HTMLElement | null,
    private options: GridCaseViewerOptions,
  ) {
    if (!container) throw new Error('GridCaseViewer: container element is required');

    this.root = container;
    this.root.classList.add('gc-root');

    // SceneView mount target
    this.viewContainer = document.createElement('div');
    this.viewContainer.className = 'gc-view';
    this.root.appendChild(this.viewContainer);

    this.overlay = new StateOverlay(this.root);
  }

  async initialize(): Promise<void> {
    this.state = 'loading';
    this.overlay.showLoading();

    try {
      const result = await loadScene(this.viewContainer, this.options);
      this.view = result.view;
      this.initialCamera = result.initialCamera;

      this.overlay.hide();
      this.state = 'ready';

      this.controlPanel = new ControlPanel(
        this.root,
        this.view,
        this.initialCamera,
        this.options.basemaps,
      );
    } catch (err) {
      this.state = 'error';

      if (err instanceof SceneLoadError) {
        this.overlay.showError(err.errorType);
      } else {
        this.overlay.showError('unknown');
      }

      throw err;
    }
  }

  resetCamera(): void {
    if (this.view && this.initialCamera) {
      resetCamera(this.view, this.initialCamera);
    }
  }

  setBasemap(id: string): void {
    this.controlPanel?.setBasemap(id);
  }

  toggleLayer(titleOrId: string, visible: boolean): void {
    this.controlPanel?.toggleLayer(titleOrId, visible);
  }

  getState(): ViewerState {
    return this.state;
  }

  destroy(): void {
    this.controlPanel?.destroy();
    this.overlay.destroy();
    this.view?.destroy();
    this.viewContainer.remove();
    this.root.classList.remove('gc-root');
    this.view = null;
    this.initialCamera = null;
    this.controlPanel = null;
    this.state = 'idle';
  }
}
