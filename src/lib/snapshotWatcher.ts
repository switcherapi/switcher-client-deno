import { DEFAULT_ENVIRONMENT } from './constants.ts';
import { GlobalOptions } from './globals/globalOptions.ts';
import { GlobalSnapshot } from './globals/globalSnapshot.ts';
import { loadDomain } from './snapshot.ts';
import * as util from './utils/index.ts';

/**
 * SnapshotWatcher is a utility class that watches for changes in the snapshot file
 * and triggers a callback when the file is modified.
 */
export class SnapshotWatcher {
  private _watcher: Deno.FsWatcher | undefined;
  private readonly _watchDebounce = new Map<string, number>();

  async watchSnapshot(environment: string, callback: {
    success?: () => void | Promise<void>;
    reject?: (err: Error) => void;
  } = {}): Promise<void> {
    const { success = () => {}, reject = () => {} } = callback;

    const snapshotFile = `${GlobalOptions.snapshotLocation}/${environment}.json`;
    this._watcher = Deno.watchFs(snapshotFile);
    for await (const event of this._watcher) {
      const dataString = JSON.stringify(event);
      if (this._watchDebounce.has(dataString)) {
        clearTimeout(this._watchDebounce.get(dataString));
        this._watchDebounce.delete(dataString);
      }

      this._watchDebounce.set(
        dataString,
        setTimeout(() => this._onModifySnapshot(environment, dataString, event, success, reject), 20),
      );
    }
  }

  stopWatching(): void {
    if (this._watcher) {
      this._watchDebounce.clear();
      this._watcher.close();
      this._watcher = undefined;
    }
  }

  private _onModifySnapshot(
    environment: string,
    dataString: string,
    event: Deno.FsEvent,
    success: () => void | Promise<void>,
    error: (err: Error) => void,
  ) {
    try {
      this._watchDebounce.delete(dataString);

      if (event.kind === 'modify') {
        GlobalSnapshot.init(loadDomain(
          util.get(GlobalOptions.snapshotLocation, ''),
          util.get(environment, DEFAULT_ENVIRONMENT),
        ));

        success();
      }
    } catch (err) {
      error(err as Error);
    }
  }
}
