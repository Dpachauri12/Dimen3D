import System from '../baseClasses/System';
import * as THREE from 'three';

export class MeasurementSystem extends System {
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  private isActive = false;
  private isMeasuring = false;
  private startPoint: THREE.Vector3 | null = null;

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

  private handleClick(worldPosition: THREE.Vector3): void {
    if (!this.isMeasuring) {
      this.startPoint = worldPosition.clone();
      this.isMeasuring = true;
      this.createPreviewLine(this.startPoint);
      return;
    }

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

    const group = new THREE.Group();

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      this.startPoint,
      endPoint,
    ]);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x2563eb,
    });

    const dimensionLine = new THREE.Line(lineGeometry, lineMaterial);
    group.add(dimensionLine);

    const distance = this.startPoint.distanceTo(endPoint);
    const label = this.createTextSprite(`${distance.toFixed(2)} m`);

    const midPoint = this.startPoint.clone().add(endPoint).multiplyScalar(0.5);
    label.position.copy(midPoint);
    label.position.y += 0.1;

    // --- TEXT ROTATION & FLIP LOGIC (PDF REQUIREMENT) ---
    const direction = endPoint.clone().sub(this.startPoint);
    const angle = Math.atan2(direction.y, direction.x);

    label.rotation.z = angle;

    // Flip text if it would appear upside down
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      label.rotation.z += Math.PI;
    }

    group.add(label);
    this.scene?.add(group);

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

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    ctx.font = '14px monospace';
    const textWidth = ctx.measureText(text).width;

    canvas.width = textWidth + 16;
    canvas.height = 28;

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e40af';
    ctx.fillText(text, 8, 18);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });

    return new THREE.Sprite(material);
  }
}
