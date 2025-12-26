import System from '../baseClasses/System';
import * as THREE from 'three';

export class MeasurementSystem extends System {
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  // state
  private isActive = false;
  private isMeasuring = false;
  private startPoint: THREE.Vector3 | null = null;

  // visuals
  private previewLine: THREE.Line | null = null;

  init(dependencies: { scene: THREE.Scene; camera: THREE.Camera }): void {
    this.scene = dependencies.scene;
    this.camera = dependencies.camera;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
    this.cancelMeasurement();
  }

  handleEvent(category: string, eventData: any): boolean {
    if (!this.isActive) return false;

    if (category === 'MOUSE' && eventData.type === 'MOUSE_CLICK') {
      this.handleClick(eventData.worldPosition);
      return true;
    }

    if (category === 'MOUSE' && eventData.type === 'MOUSE_MOVE') {
      this.handleMouseMove(eventData.worldPosition);
      return true;
    }

    if (category === 'KEY' && eventData.key === 'Escape') {
      this.cancelMeasurement();
      return true;
    }

    return false;
  }

  dispose(): void {
    this.cancelMeasurement();
  }

  // ================= helpers =================

  private handleClick(worldPosition: THREE.Vector3): void {
    // first click → start measuring
    if (!this.isMeasuring) {
      this.startPoint = worldPosition.clone();
      this.isMeasuring = true;
      this.createPreviewLine(this.startPoint);
      return;
    }

    // second click → finish measuring
    this.completeMeasurement(worldPosition.clone());
  }

  private handleMouseMove(worldPosition: THREE.Vector3): void {
    if (!this.previewLine || !this.startPoint) return;

    const geometry = this.previewLine.geometry as THREE.BufferGeometry;
    geometry.setFromPoints([this.startPoint, worldPosition]);
  }

  private createPreviewLine(start: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, start]);

    const material = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.2,
      gapSize: 0.1,
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.previewLine.computeLineDistances();
    this.scene?.add(this.previewLine);
  }

  private completeMeasurement(endPoint: THREE.Vector3): void {
    if (!this.startPoint) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      this.startPoint,
      endPoint,
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0x2563eb,
    });

    const line = new THREE.Line(geometry, material);
    this.scene?.add(line);

    this.cancelMeasurement();
  }

  private cancelMeasurement(): void {
    if (this.previewLine) {
      this.scene?.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    this.startPoint = null;
    this.isMeasuring = false;
  }
}
