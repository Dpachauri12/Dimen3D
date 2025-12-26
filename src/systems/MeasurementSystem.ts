import System from '../baseClasses/System';
import * as THREE from 'three';

export class MeasurementSystem extends System {
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  private readonly SNAP_INCREMENT = 0.5;

  private isActive = false;
  private isMeasuring = false;
  private startPoint: THREE.Vector3 | null = null;

  private previewLine: THREE.Line | null = null;
  private measurements: THREE.Group[] = [];

  private dimensionMaterial = new THREE.LineBasicMaterial({ color: 0x2563eb });
  private previewMaterial = new THREE.LineDashedMaterial({
    color: 0x94a3b8,
    dashSize: 0.2,
    gapSize: 0.1,
  });

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
    this.measurements.forEach(m => this.disposeGroup(m));
    this.measurements = [];
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
    const geo = this.previewLine.geometry as THREE.BufferGeometry;
    geo.setFromPoints([this.startPoint, worldPosition]);
    this.previewLine.computeLineDistances();
  }

  private createPreviewLine(start: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry().setFromPoints([start, start]);
    this.previewLine = new THREE.Line(geo, this.previewMaterial);
    this.previewLine.computeLineDistances();
    this.scene?.add(this.previewLine);
  }

  private completeMeasurement(endPoint: THREE.Vector3): void {
    if (!this.startPoint) return;

    const start = this.startPoint.clone();
    const rawDistance = start.distanceTo(endPoint);
    const snapped =
      Math.round(rawDistance / this.SNAP_INCREMENT) * this.SNAP_INCREMENT;

    const dir = endPoint.clone().sub(start).normalize();
    const normal = new THREE.Vector3(-dir.y, dir.x, 0);

    const gap = 0.02;
    const overshoot = 0.03;

    const group = new THREE.Group();

    const ext1 = this.createLine(
      start.clone().add(normal.clone().multiplyScalar(gap)),
      start
        .clone()
        .add(normal.clone().multiplyScalar(gap))
        .add(dir.clone().multiplyScalar(rawDistance + overshoot))
    );

    const ext2 = this.createLine(
      endPoint.clone().add(normal.clone().multiplyScalar(gap)),
      endPoint
        .clone()
        .add(normal.clone().multiplyScalar(gap))
        .sub(dir.clone().multiplyScalar(rawDistance + overshoot))
    );

    group.add(ext1, ext2);

    const dimStart = start
      .clone()
      .add(normal.clone().multiplyScalar(gap))
      .add(dir.clone().multiplyScalar(0.05));

    const dimEnd = endPoint
      .clone()
      .add(normal.clone().multiplyScalar(gap))
      .sub(dir.clone().multiplyScalar(0.05));

    group.add(this.createLine(dimStart, dimEnd));

    group.add(
      this.createArrow(dimStart, dir.clone().negate()),
      this.createArrow(dimEnd, dir)
    );

    const label = this.createTextSprite(`${snapped.toFixed(2)} m`);
    const mid = dimStart.clone().add(dimEnd).multiplyScalar(0.5);

    const angleRad = Math.atan2(dir.y, dir.x);
    const angleDeg = Math.abs(THREE.MathUtils.radToDeg(angleRad));

    label.position.copy(mid);

    if (angleDeg < 30) {
      label.rotation.z = 0;
      label.position.add(normal.clone().multiplyScalar(0.06));
    } else if (angleDeg < 60) {
      label.rotation.z = angleRad;
    } else {
      label.rotation.z = 0;
      label.position.add(new THREE.Vector3(0.06, 0, 0));
    }

    group.add(label);

    this.scene?.add(group);
    this.measurements.push(group);

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

  private createLine(a: THREE.Vector3, b: THREE.Vector3): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    return new THREE.Line(geo, this.dimensionMaterial);
  }

  private createArrow(pos: THREE.Vector3, dir: THREE.Vector3): THREE.Mesh {
    const size = 0.08;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-size, size / 2);
    shape.lineTo(-size, -size / 2);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2563eb });

    const arrow = new THREE.Mesh(geo, mat);
    arrow.position.copy(pos);
    arrow.lookAt(pos.clone().add(dir));

    return arrow;
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    ctx.font = '14px monospace';
    const width = ctx.measureText(text).width;

    canvas.width = width + 16;
    canvas.height = 28;

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e40af';
    ctx.fillText(text, 8, 18);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse(obj => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const m = (obj as any).material;
        Array.isArray(m) ? m.forEach(x => x.dispose()) : m.dispose();
      }
    });
    this.scene?.remove(group);
  }
}
