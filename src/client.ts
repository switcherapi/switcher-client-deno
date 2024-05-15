import * as remote from './lib/remote.ts';
import * as util from './lib/utils/index.ts';
import Bypasser from './lib/bypasser/index.ts';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOCAL,
  DEFAULT_LOGGER,
  DEFAULT_REGEX_MAX_BLACKLISTED,
  DEFAULT_REGEX_MAX_TIME_LIMIT,
  DEFAULT_TEST_MODE,
  SWITCHER_OPTIONS,
} from './lib/constants.ts';
import type { Snapshot, SwitcherContext, SwitcherOptions } from './types/index.d.ts';
import type Key from './lib/bypasser/key.ts';
import TimedMatch from './lib/utils/timed-match/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.ts';
import { SnapshotNotFoundError } from './lib/exceptions/index.ts';
import { checkSwitchersLocal, loadDomain, validateSnapshot } from './lib/snapshot.ts';
import { Switcher } from './switcher.ts';
import { Auth } from './lib/remote-auth.ts';

/**
 * Quick start with the following 3 steps.
 *
 * 1. Use Client.buildContext() to define the arguments to connect to the API.
 * 2. Use Client.getSwitcher() to create a new instance of Switcher.
 * 3. Use the instance created to call isItOn to execute criteria evaluation.
 */
export class Client {
  private static _testEnabled = DEFAULT_TEST_MODE;
  private static _watching = false;
  private static _watcher: Deno.FsWatcher;
  private static _watchDebounce = new Map<string, number>();

  private static _snapshot?: Snapshot;
  private static _context: SwitcherContext;
  private static _options: SwitcherOptions;

  /**
   * Create client context to be used by Switcher
   */
  static buildContext(context: SwitcherContext, options?: SwitcherOptions) {
    this._testEnabled = DEFAULT_TEST_MODE;

    this._snapshot = undefined;
    this._context = context;
    this._context.environment = util.get(context.environment, DEFAULT_ENVIRONMENT);

    // Default values
    this._options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      local: util.get(options?.local, DEFAULT_LOCAL),
      logger: util.get(options?.logger, DEFAULT_LOGGER),
    };

    if (options) {
      Client.buildOptions(options);
    }

    // Initialize Auth
    Auth.init(this._context);
  }

  private static buildOptions(options: SwitcherOptions) {
    if (SWITCHER_OPTIONS.CERT_PATH in options && options.certPath) {
      remote.setCerts(options.certPath);
    }

    if (SWITCHER_OPTIONS.SILENT_MODE in options && options.silentMode) {
      this._initSilentMode(options.silentMode);
    }

    if (SWITCHER_OPTIONS.SNAPSHOT_AUTO_UPDATE_INTERVAL in options) {
      this._options.snapshotAutoUpdateInterval = options.snapshotAutoUpdateInterval;
      this.scheduleSnapshotAutoUpdate();
    }

    this._initTimedMatch(options);
  }

  private static _initSilentMode(silentMode: string) {
    Auth.setRetryOptions(silentMode);

    this._options.silentMode = silentMode;
    this.loadSnapshot();
  }

  private static _initTimedMatch(options: SwitcherOptions) {
    if (SWITCHER_OPTIONS.REGEX_MAX_BLACK_LIST in options) {
      TimedMatch.setMaxBlackListed(util.get(options.regexMaxBlackList, DEFAULT_REGEX_MAX_BLACKLISTED));
    }

    if (SWITCHER_OPTIONS.REGEX_MAX_TIME_LIMIT in options) {
      TimedMatch.setMaxTimeLimit(util.get(options.regexMaxTimeLimit, DEFAULT_REGEX_MAX_TIME_LIMIT));
    }

    const hasRegexSafeOption = SWITCHER_OPTIONS.REGEX_SAFE in options;
    if (!hasRegexSafeOption || (hasRegexSafeOption && options.regexSafe)) {
      TimedMatch.initializeWorker();
    }
  }

  /**
   * Creates a new instance of Switcher
   */
  static getSwitcher(key?: string): Switcher {
    return new Switcher(util.get(key, ''));
  }

  /**
   * Verifies if the current snapshot file is updated.
   *
   * Return true if an update has been made.
   */
  static async checkSnapshot(): Promise<boolean> {
    if (!Client._snapshot) {
      throw new SnapshotNotFoundError('Snapshot is not loaded. Use Client.loadSnapshot()');
    }

    if (Auth.isTokenExpired()) {
      await Auth.auth();
    }

    const snapshot = await validateSnapshot(
      util.get(Client._context.domain, ''),
      util.get(Client._context.environment, DEFAULT_ENVIRONMENT),
      util.get(Client._context.component, ''),
      Client._snapshot.data.domain.version,
    );

    if (snapshot) {
      if (Client._options.snapshotLocation?.length) {
        Deno.writeTextFileSync(
          `${Client._options.snapshotLocation}/${Client._context.environment}.json`,
          snapshot,
        );
      }

      Client._snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  /**
   * Read snapshot and load it into memory
   *
   * @param watchSnapshot when true, it will watch for snapshot file modifications
   * @param fetchRemote when true, it will initialize the snapshot from the API
   */
  static async loadSnapshot(
    watchSnapshot = false,
    fetchRemote = false,
  ): Promise<number> {
    Client._snapshot = loadDomain(
      util.get(Client._options.snapshotLocation, ''),
      util.get(Client._context.environment, DEFAULT_ENVIRONMENT),
    );

    if (
      Client._snapshot?.data.domain.version == 0 &&
      (fetchRemote || !Client._options.local)
    ) {
      await Client.checkSnapshot();
    }

    if (watchSnapshot) {
      Client.watchSnapshot();
    }

    return Client._snapshot?.data.domain.version || 0;
  }

  /**
   * Start watching snapshot files for modifications
   *
   * @param success when snapshot has successfully updated
   * @param reject when any error has thrown when attempting to load snapshot
   */
  static async watchSnapshot(callback: {
    success?: () => void | Promise<void>;
    reject?: (err: Error) => void;
  } = {}): Promise<void> {
    const { success = () => {}, reject = () => {} } = callback;

    if (Client._testEnabled || !Client._options.snapshotLocation?.length) {
      return reject(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    const snapshotFile = `${Client._options.snapshotLocation}/${Client._context.environment}.json`;
    Client._watcher = Deno.watchFs(snapshotFile);
    Client._watching = true;
    for await (const event of Client._watcher) {
      const dataString = JSON.stringify(event);
      if (Client._watchDebounce.has(dataString)) {
        clearTimeout(Client._watchDebounce.get(dataString));
        Client._watchDebounce.delete(dataString);
      }

      Client._watchDebounce.set(
        dataString,
        setTimeout(() => Client._onModifySnapshot(dataString, event, success, reject), 20),
      );
    }
  }

  private static _onModifySnapshot(
    dataString: string,
    event: Deno.FsEvent,
    success: () => void | Promise<void>,
    error: (err: Error) => void,
  ) {
    Client._watchDebounce.delete(dataString);
    if (event.kind === 'modify') {
      try {
        Client._snapshot = loadDomain(
          util.get(Client._options.snapshotLocation, ''),
          util.get(Client._context.environment, DEFAULT_ENVIRONMENT),
        );

        success();
      } catch (err) {
        error(err);
      }
    }
  }

  /**
   * Terminate watching snapshot files
   */
  static unloadSnapshot() {
    if (Client._testEnabled) {
      return;
    }

    Client._snapshot = undefined;
    if (Client._watcher && Client._watching) {
      Client._watching = false;
      Client._watcher.close();
    }
  }

  /**
   * Schedule Snapshot auto update.
   *
   * It can also be configured using SwitcherOptions 'snapshotAutoUpdateInterval' when
   * building context
   *
   * @param interval in ms
   */
  static scheduleSnapshotAutoUpdate(
    interval?: number,
    callback: {
      success?: (updated: boolean) => void;
      reject?: (err: Error) => void;
    } = {},
  ) {
    const { success = () => {}, reject = () => {} } = callback;

    if (interval) {
      Client._options.snapshotAutoUpdateInterval = interval;
    }

    if (Client._options.snapshotAutoUpdateInterval && Client._options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(
        Client._options.snapshotAutoUpdateInterval,
        this.checkSnapshot,
        success,
        reject,
      );
    }
  }

  /**
   * Terminates Snapshot Auto Update
   */
  static terminateSnapshotAutoUpdate() {
    SnapshotAutoUpdater.terminate();
  }

  /**
   * Verifies if switchers are properly configured
   *
   * @param switcherKeys Client Keys
   * @throws when one or more Client Keys were not found
   */
  static async checkSwitchers(switcherKeys: string[]) {
    if (Client._options.local && Client._snapshot) {
      checkSwitchersLocal(Client._snapshot, switcherKeys);
    } else {
      await Client.checkSwitchersRemote(switcherKeys);
    }
  }

  private static async checkSwitchersRemote(switcherKeys: string[]) {
    try {
      await Auth.auth();
      await remote.checkSwitchers(switcherKeys);
    } catch (err) {
      if (Client._options.silentMode && Client._snapshot) {
        checkSwitchersLocal(Client._snapshot, switcherKeys);
      } else {
        throw err;
      }
    }
  }

  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   */
  static assume(key: string): Key {
    return Bypasser.assume(key);
  }

  /**
   * Remove forced value from a switcher
   */
  static forget(key: string): void {
    return Bypasser.forget(key);
  }

  /**
   * Subscribe to notify when an asynchronous error is thrown.
   *
   * It is usually used when throttle and silent mode are enabled.
   *
   * @param callback function to be called when an error is thrown
   */
  static subscribeNotifyError(callback: (err: Error) => void) {
    ExecutionLogger.subscribeNotifyError(callback);
  }

  /**
   * Retrieve execution log given a switcher key
   */
  static getLogger(key: string): ExecutionLogger[] {
    return ExecutionLogger.getByKey(key);
  }

  /**
   * Retrieve execution log from a switcher
   */
  static getExecution(switcher: Switcher): ExecutionLogger {
    return ExecutionLogger.getExecution(switcher.key, switcher.input);
  }

  /**
   * Clear all results from the execution log
   */
  static clearLogger(): void {
    ExecutionLogger.clearLogger();
  }

  /**
   * Enable/Disable test mode.
   *
   * It prevents from watching Snapshots that may hold process
   */
  static testMode(testEnabled: boolean = true): void {
    Client._testEnabled = testEnabled;
  }

  static get options(): SwitcherOptions {
    return Client._options;
  }

  static get snapshot(): Snapshot | undefined {
    return Client._snapshot;
  }
}
