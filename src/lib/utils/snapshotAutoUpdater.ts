export default class SnapshotAutoUpdater {
  private static _intervalId: number | undefined;

  static schedule(
    interval: number,
    checkSnapshot: () => Promise<boolean>,
    success: (updated: boolean) => void,
    reject: (err: Error) => void,
  ) {
    if (this._intervalId) {
      this.terminate();
    }

    this._intervalId = setInterval(async () => {
      try {
        const updated = await checkSnapshot();
        success(updated);
      } catch (err) {
        reject(err as Error);
      }
    }, interval * 1000);
  }

  static terminate() {
    clearInterval(this._intervalId);
  }
}
