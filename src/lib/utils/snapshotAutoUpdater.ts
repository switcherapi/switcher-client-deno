export default class SnapshotAutoUpdater {
  static _worker: number | undefined;

  static schedule(
    interval: number,
    checkSnapshot: () => Promise<boolean>,
    success?: (updated: boolean) => void,
    reject?: (err: Error) => void,
  ) {
    if (this._worker) {
      this.terminate();
    }

    this._worker = setInterval(async () => {
      try {
        const updated = await checkSnapshot();
        if (success) {
          success(updated);
        }
      } catch (err) {
        if (reject) {
          this.terminate();
          reject(err);
        }
      }
    }, interval);
  }

  static terminate() {
    clearInterval(this._worker);
  }
}
