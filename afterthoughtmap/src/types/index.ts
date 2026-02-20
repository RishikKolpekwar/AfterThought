import type SceneView from '@arcgis/core/views/SceneView';
import type WebScene from '@arcgis/core/WebScene';
import type Camera from '@arcgis/core/Camera';

export interface GridCaseViewerOptions {
  webSceneId: string;
  apiKey?: string;
  basemaps?: BasemapOption[];
  qualityProfile?: 'low' | 'medium' | 'high';
  camera?: any;
}

export interface BasemapOption {
  id: string;
  label: string;
}

export interface LayerInfo {
  id: string;
  title: string;
  visible: boolean;
  type: string;
}

export type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

export type ErrorType = 'network' | 'auth' | 'webgl' | 'scene' | 'unknown';

export interface SceneLoadResult {
  view: SceneView;
  scene: WebScene;
  initialCamera: Camera;
}
