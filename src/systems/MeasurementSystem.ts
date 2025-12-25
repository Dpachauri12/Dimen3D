import System from '../baseClasses/System';
import * as THREE from 'three';

export class MeasurementSystem extends System {
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  init(dependencies: { scene: THREE.Scene; camera: THREE.Camera }): void {
    this.scene = dependencies.scene;
    this.camera = dependencies.camera;
    // logic will be added later
  }

  activate(): void {
    // start measurement mode
  }

  deactivate(): void {
    // clean up when measurement mode ends
  }

  handleEvent(category: string, eventData: any): boolean {
    // mouse clicks, mouse move, escape key will be handled here
    return false;
  }

  dispose(): void {
    // full cleanup will be added later
  }
}
