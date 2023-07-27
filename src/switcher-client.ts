import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import DateMoment from './lib/utils/datemoment.ts';
import TimedMatch from './lib/utils/timed-match/index.ts';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.ts';
import { checkSwitchers, loadDomain, validateSnapshot } from './lib/snapshot.ts';
import * as services from './lib/remote.ts';
import checkCriteriaOffline from './lib/resolver.ts';
import { RetryOptions, Snapshot, SwitcherContext, SwitcherOptions } from './types/index.d.ts';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOGGER,
  DEFAULT_OFFLINE,
  DEFAULT_REGEX_MAX_BLACKLISTED,
  DEFAULT_REGEX_MAX_TIME_LIMIT,
  DEFAULT_RETRY_TIME,
  DEFAULT_SNAPSHOT_LOCATION,
  DEFAULT_TEST_MODE,
} from './lib/constants.ts';

/**
 * Quick start with the following 3 steps.
 *
 * 1. Use Switcher.buildContext() to define the arguments to connect to the API.
 * 2. Use Switcher.factory() to create a new instance of Switcher.
 * 3. Use the instance created to call isItOn to query the API.
 */
export class Switcher {
  private static _testEnabled = DEFAULT_TEST_MODE;
  private static _watcher: Deno.FsWatcher;
  private static _watchDebounce = new Map<string, number>();

  private static _snapshot?: Snapshot;
  private static _context: SwitcherContext;
  private static _options: SwitcherOptions;
  private static _retryOptions: RetryOptions;

  private _delay = 0;
  private _nextRun = 0;
  private _input?: string[][];
  private _key = '';

  /**
   * Create the necessary configuration to communicate with the API
   *
   * @param context Necessary arguments
   * @param options
   */
  static buildContext(context: SwitcherContext, options?: SwitcherOptions) {
    this._testEnabled = DEFAULT_TEST_MODE;

    this._snapshot = undefined;
    this._context = {
      domain: context.domain,
      environment: context.environment,
    };
    this._context = context;
    this._context.url = context.url;
    this._context.environment = context.environment || DEFAULT_ENVIRONMENT;

    // Default values
    this._options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation || DEFAULT_SNAPSHOT_LOCATION,
      offline: options?.offline != undefined ? options.offline : DEFAULT_OFFLINE,
      logger: options?.logger != undefined ? options.logger : DEFAULT_LOGGER,
    };

    if (options) {
      Switcher.buildOptions(options);
    }
  }

  private static buildOptions(options: SwitcherOptions) {
    if ('certPath' in options && options.certPath) {
      services.setCerts(options.certPath);
    }

    if ('silentMode' in options) {
      this._options.silentMode = options.silentMode;
      this.loadSnapshot();
    }

    if ('snapshotAutoUpdateInterval' in options) {
      this._options.snapshotAutoUpdateInterval = options.snapshotAutoUpdateInterval;
      this.scheduleSnapshotAutoUpdate();
    }

    if ('retryAfter' in options) {
      this._retryOptions = {
        retryTime: parseInt(options.retryAfter?.slice(0, -1) || DEFAULT_RETRY_TIME.charAt(0)),
        retryDurationIn: options.retryAfter?.slice(-1) || DEFAULT_RETRY_TIME.charAt(1),
      };
    } else {
      this._retryOptions = {
        retryTime: parseInt(DEFAULT_RETRY_TIME.charAt(0)),
        retryDurationIn: DEFAULT_RETRY_TIME.charAt(1),
      };
    }

    this._initTimedMatch(options);
  }

  /**
   * Creates a new instance of Switcher
   */
  static factory() {
    return new Switcher();
  }

  /**
   * Verifies if the current snapshot file is updated.
   * Return true if an update has been made.
   */
  static async checkSnapshot() {
    if (Switcher._snapshot) {
      if (
        !Switcher._context.exp ||
        Date.now() > (Switcher._context.exp * 1000)
      ) {
        await Switcher._auth();
      }

      const result = await validateSnapshot(
        Switcher._context,
        Switcher._options.snapshotLocation,
        Switcher._snapshot.data.domain.version,
      );

      if (result) {
        Switcher.loadSnapshot();
        return true;
      }
    }

    return false;
  }

  /**
   * Read snapshot file locally and store in a parsed JSON object
   *
   * @param watchSnapshot enable watchSnapshot when true
   */
  static async loadSnapshot(watchSnapshot?: boolean, fecthOnline?: boolean) {
    Switcher._snapshot = loadDomain(
      Switcher._options.snapshotLocation || '',
      Switcher._context.environment,
    );
    if (
      Switcher._snapshot?.data.domain.version == 0 &&
      (fecthOnline || !Switcher._options.offline)
    ) {
      await Switcher.checkSnapshot();
    }

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }
  }

  /**
   * Start watching snapshot files for modifications
   *
   * @param success when snapshot has successfully updated
   * @param error when any error has thrown when attempting to load snapshot
   */
  static async watchSnapshot(success?: () => void | Promise<void>, error?: (err: Error) => void): Promise<void> {
    if (Switcher._testEnabled) {
      return;
    }

    const snapshotFile = `${Switcher._options.snapshotLocation}${Switcher._context.environment}.json`;
    Switcher._watcher = Deno.watchFs(snapshotFile);
    for await (const event of Switcher._watcher) {
      const dataString = JSON.stringify(event);
      if (Switcher._watchDebounce.has(dataString)) {
        clearTimeout(Switcher._watchDebounce.get(dataString));
        Switcher._watchDebounce.delete(dataString);
      }

      Switcher._watchDebounce.set(
        dataString,
        setTimeout(() => {
          Switcher._onModifySnapshot(dataString, event, success, error);
        }, 20),
      );
    }
  }

  /**
   * Remove snapshot from real-time update
   */
  static unloadSnapshot() {
    if (Switcher._testEnabled) {
      return;
    }

    Switcher._snapshot = undefined;
    if (Switcher._watcher?.rid in Deno.resources()) {
      Deno.close(Switcher._watcher.rid);
    }
  }

  /**
   * Schedule Snapshot auto update.
   * It can also be configured using SwitcherOptions 'snapshotAutoUpdateInterval' when
   * building context
   *
   * @param interval in ms
   */
  static scheduleSnapshotAutoUpdate(interval?: number) {
    if (interval) {
      Switcher._options.snapshotAutoUpdateInterval = interval;
    }

    if (Switcher._options.snapshotAutoUpdateInterval && Switcher._options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(Switcher._options.snapshotAutoUpdateInterval, this.checkSnapshot);
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
   * @param switcherKeys Switcher Keys
   * @throws when one or more Switcher Keys were not found
   */
  static async checkSwitchers(switcherKeys: string[]) {
    if (Switcher._options.offline && Switcher._snapshot) {
      checkSwitchers(Switcher._snapshot, switcherKeys);
    } else {
      try {
        await Switcher._auth();
        await services.checkSwitchers(
          Switcher._context.url || '',
          Switcher._context.token,
          switcherKeys,
        );
      } catch (e) {
        if (Switcher._options.silentMode && Switcher._snapshot) {
          checkSwitchers(Switcher._snapshot, switcherKeys);
        } else {
          throw e;
        }
      }
    }
  }

  private static _onModifySnapshot(
    dataString: string,
    event: Deno.FsEvent,
    success?: () => void | Promise<void>,
    error?: (err: Error) => void,
  ) {
    Switcher._watchDebounce.delete(dataString);
    if (event.kind === 'modify') {
      try {
        Switcher._snapshot = loadDomain(
          Switcher._options.snapshotLocation || '',
          Switcher._context.environment,
        );

        if (success) {
          success();
        }
      } catch (err) {
        if (error) {
          error(err);
        }
      }
    }
  }

  private static _initTimedMatch(options: SwitcherOptions) {
    if ('regexMaxBlackList' in options) {
      TimedMatch.setMaxBlackListed(options.regexMaxBlackList || DEFAULT_REGEX_MAX_BLACKLISTED);
    }

    if ('regexMaxTimeLimit' in options) {
      TimedMatch.setMaxTimeLimit(options.regexMaxTimeLimit || DEFAULT_REGEX_MAX_TIME_LIMIT);
    }
  }

  private static async _auth() {
    const response = await services.auth(Switcher._context);
    Switcher._context.token = response.token;
    Switcher._context.exp = response.exp;
  }

  private static async _checkHealth() {
    // checks if silent mode is still activated
    if (Switcher._context.token === 'SILENT') {
      if (
        !Switcher._context.exp ||
        Date.now() < (Switcher._context.exp * 1000)
      ) {
        const expirationTime = new DateMoment(new Date())
          .add(
            Switcher._retryOptions.retryTime,
            Switcher._retryOptions.retryDurationIn,
          )
          .getDate();

        Switcher._context.exp = expirationTime.getTime() / 1000;
        return false;
      }
    }

    const response = await services.checkAPIHealth(
      Switcher._context.url || '',
      Switcher._options,
      Switcher._retryOptions,
    );

    if (response) {
      Switcher._context.token = response.data.token;
      Switcher._context.exp = response.data.exp;
      return false;
    }

    return true;
  }

  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   *
   * @param key
   */
  static assume(key: string) {
    return Bypasser.assume(key);
  }

  /**
   * Remove forced value from a switcher
   *
   * @param key
   */
  static forget(key: string) {
    return Bypasser.forget(key);
  }

  /**
   * Retrieve execution log given a switcher key
   *
   * @param key
   */
  static getLogger(key: string) {
    return ExecutionLogger.getByKey(key);
  }

  /**
   * Clear all results from the execution log
   */
  static clearLogger() {
    ExecutionLogger.clearLogger();
  }

  /**
   * Enable testing mode
   * It prevents from watching Snapshots that may hold process
   */
  static setTestEnabled() {
    Switcher._testEnabled = true;
  }

  /**
   * Disable testing mode
   */
  static setTestDisabled() {
    Switcher._testEnabled = false;
  }

  /**
   * Pre-set input values before calling the API
   *
   * @param key
   * @param input
   */
  async prepare(key: string, input?: string[][]) {
    this._key = key;

    if (input) this._input = input;

    if (!Switcher._options.offline) {
      await Switcher._auth();
    }
  }

  /**
   * Validate the input provided to access the API
   */
  async validate() {
    const errors = [];

    if (!Switcher._context.apiKey) {
      errors.push('Missing API Key field');
    }

    if (!Switcher._context.component) {
      errors.push('Missing component field');
    }

    if (!this._key) {
      errors.push('Missing key field');
    }

    await this._executeApiValidation();
    if (!Switcher._context.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  /**
   * Execute async criteria
   *
   * @param key
   * @param input
   * @param showReason Display details when using ExecutionLogger
   */
  async isItOn(key?: string, input?: string[][], showReason = false): Promise<boolean> {
    let result;
    this._validateArgs(key, input);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      return bypassKey.getValue();
    }

    // verify if query from snapshot
    if (Switcher._options.offline) {
      result = await this._executeOfflineCriteria();
    } else {
      try {
        await this.validate();
        if (Switcher._context.token === 'SILENT') {
          result = await this._executeOfflineCriteria();
        } else {
          result = await this._executeOnlineCriteria(showReason);
        }
      } catch (e) {
        if (Switcher._options.silentMode) {
          return this._executeOfflineCriteria();
        }

        throw e;
      }
    }

    return result;
  }

  /**
   * Configure the time elapsed between each call to the API.
   * Activating this option will enable loggers.
   *
   * @param delay in milliseconds
   */
  throttle(delay: number) {
    this._delay = delay;

    if (delay > 0) {
      Switcher._options.logger = true;
    }

    return this;
  }

  async _executeOnlineCriteria(showReason: boolean) {
    if (!this._useSync()) {
      return this._executeAsyncOnlineCriteria(showReason);
    }

    const responseCriteria = await services.checkCriteria(
      Switcher._context,
      this._key,
      this._input,
      showReason,
    );

    if (Switcher._options.logger && this._key) {
      ExecutionLogger.add(responseCriteria, this._key, this._input);
    }

    return responseCriteria.result;
  }

  _executeAsyncOnlineCriteria(showReason: boolean) {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;
      services.checkCriteria(
        Switcher._context,
        this._key,
        this._input,
        showReason,
      )
        .then((response) => ExecutionLogger.add(response, this._key, this._input));
    }

    return ExecutionLogger.getExecution(this._key, this._input).response.result;
  }

  async _executeApiValidation() {
    if (this._useSync()) {
      if (
        await Switcher._checkHealth() &&
        (!Switcher._context.exp ||
          Date.now() > (Switcher._context.exp * 1000))
      ) {
        await this.prepare(this._key, this._input);
      }
    }
  }

  async _executeOfflineCriteria() {
    const response = await checkCriteriaOffline(
      Switcher._snapshot,
      this._key || '',
      this._input || [],
    );

    if (Switcher._options.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    return response.result;
  }

  _validateArgs(key?: string, input?: string[][]) {
    if (key) this._key = key;
    if (input) this._input = input;
  }

  _useSync() {
    return this._delay == 0 ||
      !ExecutionLogger.getExecution(this._key, this._input);
  }

  get key() {
    return this._key;
  }

  get input() {
    return this._input;
  }

  get nextRun() {
    return this._nextRun;
  }

  static get snapshot() {
    return Switcher._snapshot;
  }
}
