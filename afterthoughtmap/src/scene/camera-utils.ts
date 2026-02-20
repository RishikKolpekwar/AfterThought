import type SceneView from '@arcgis/core/views/SceneView';
import type Camera from '@arcgis/core/Camera';

const ANIMATION_DURATION = 1000;

export function resetCamera(view: SceneView, initialCamera: Camera): void {
  view.goTo(initialCamera, { duration: ANIMATION_DURATION }).catch(() => {
    // Navigation interrupted — safe to ignore
  });
}

export function zoomIn(view: SceneView): void {
  view.goTo({ zoom: view.zoom + 1 }, { duration: ANIMATION_DURATION / 2 }).catch(() => {});
}

export function zoomOut(view: SceneView): void {
  view.goTo({ zoom: view.zoom - 1 }, { duration: ANIMATION_DURATION / 2 }).catch(() => {});
}
