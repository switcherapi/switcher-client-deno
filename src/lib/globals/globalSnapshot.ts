import type { Snapshot } from '../../types/index.d.ts';

export class GlobalSnapshot {
  private static snapshotStore?: Snapshot;

  static init(snapshot: Snapshot) {
    this.snapshotStore = snapshot;
  }

  static clear() {
    this.snapshotStore = undefined;
  }

  static get snapshot() {
    return this.snapshotStore;
  }
}
