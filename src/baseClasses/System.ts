export default class System {
  private static registry: WeakMap<Function, System> = new WeakMap();
  protected enabled: boolean = true;

  protected constructor() {}

  static createReference(this: any, ...args: any[]): any {
    const existing = System.registry.get(this);
    if (existing) return existing;
    const instance = new this(...args);
    System.registry.set(this, instance);
    return instance;
  }

  static getReference(this: any): any {
    const existing = System.registry.get(this);
    if (!existing) {
      throw new Error(`${this.name} instance not created.`);
    }
    return existing;
  }

  init(_dependencies: any): void {}
  update(_deltaTime: number): void {}
  activate(): void {}
  deactivate(): void {}
  dispose(): void {}

  handleEvent(_category: string, _eventData: any): boolean {
    return false;
  }
}
