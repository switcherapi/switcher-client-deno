export default class SnapshotAutoUpdater {
  static _worker: number | undefined;

  static schedule(interval: number, checkSnapshot: () => Promise<boolean>) {
    if (this._worker) {
      this.terminate();
    }

    this._worker = setInterval(() => checkSnapshot(), interval);
  }

  static terminate() {
    clearInterval(this._worker);
  }
}
