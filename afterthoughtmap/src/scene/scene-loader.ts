import WebScene from '@arcgis/core/WebScene.js';
import SceneView from '@arcgis/core/views/SceneView.js';
import esriConfig from '@arcgis/core/config.js';
import type { GridCaseViewerOptions, SceneLoadResult, ErrorType } from '../types/index.js';

export class SceneLoadError extends Error {
  constructor(
    message: string,
    public readonly errorType: ErrorType,
  ) {
    super(message);
    this.name = 'SceneLoadError';
  }
}

function classifyError(err: unknown): ErrorType {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes('webgl') || msg.includes('gpu')) return 'webgl';
  if (msg.includes('401') || msg.includes('403') || msg.includes('token') || msg.includes('authentication') || msg.includes('authorized')) return 'auth';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to load') || msg.includes('timeout')) return 'network';
  if (msg.includes('scene') || msg.includes('portal item')) return 'scene';
  return 'unknown';
}

export async function loadScene(
  container: HTMLElement,
  options: GridCaseViewerOptions,
): Promise<SceneLoadResult> {
  if (options.apiKey) {
    esriConfig.apiKey = options.apiKey;
  }

  let scene: WebScene;
  try {
    scene = new WebScene({ portalItem: { id: options.webSceneId } });
    await scene.load();
  } catch (err) {
    const type = classifyError(err);
    throw new SceneLoadError(
      `Failed to load WebScene: ${err instanceof Error ? err.message : err}`,
      type,
    );
  }

  let view: SceneView;
  try {
    view = new SceneView({
      container: container as HTMLDivElement,
      map: scene,
      qualityProfile: options.qualityProfile ?? 'medium',
      popup: { autoCloseEnabled: true },
      environment: {
        lighting: { directShadowsEnabled: false },
      },
      camera: options.camera,
    });
    await view.when();
  } catch (err) {
    const type = classifyError(err);
    throw new SceneLoadError(
      `Failed to create SceneView: ${err instanceof Error ? err.message : err}`,
      type,
    );
  }

  const initialCamera = view.camera.clone();

  return { view, scene, initialCamera };
}
