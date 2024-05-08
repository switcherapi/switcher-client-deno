import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import DateMoment from './lib/utils/datemoment.ts';
import TimedMatch from './lib/utils/timed-match/index.ts';
import SnapshotAutoUpdater from './lib/utils/snapshotAutoUpdater.ts';
import { checkSwitchersLocal, loadDomain, validateSnapshot } from './lib/snapshot.ts';
import * as remote from './lib/remote.ts';
import checkCriteriaLocal from './lib/resolver.ts';
import type { ResultDetail, RetryOptions, Snapshot, SwitcherContext, SwitcherOptions } from './types/index.d.ts';
import type Key from './lib/bypasser/key.ts';
import { SnapshotNotFoundError } from './lib/exceptions/index.ts';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOCAL,
  DEFAULT_LOGGER,
  DEFAULT_REGEX_MAX_BLACKLISTED,
  DEFAULT_REGEX_MAX_TIME_LIMIT,
  DEFAULT_TEST_MODE,
  SWITCHER_OPTIONS,
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
  private static _watching = false;
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
  private _forceRemote = false;
  private _showDetail = false;

  /**
   * Create the necessary configuration to communicate with the API
   *
   * @param context Necessary arguments
   * @param options
   */
  static buildContext(context: SwitcherContext, options?: SwitcherOptions) {
    this._testEnabled = DEFAULT_TEST_MODE;

    this._snapshot = undefined;
    this._context = context;
    this._context.url = context.url;
    this._context.environment = Switcher._get(context.environment, DEFAULT_ENVIRONMENT);

    // Default values
    this._options = {
      snapshotAutoUpdateInterval: 0,
      snapshotLocation: options?.snapshotLocation,
      local: Switcher._get(options?.local, DEFAULT_LOCAL),
      logger: Switcher._get(options?.logger, DEFAULT_LOGGER),
    };

    if (options) {
      Switcher.buildOptions(options);
    }
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

  /**
   * Creates a new instance of Switcher
   */
  static factory(): Switcher {
    return new Switcher();
  }

  /**
   * Verifies if the current snapshot file is updated.
   * Return true if an update has been made.
   */
  static async checkSnapshot(): Promise<boolean> {
    if (!Switcher._snapshot) {
      throw new SnapshotNotFoundError('Snapshot is not loaded. Use Switcher.loadSnapshot()');
    }

    if (
      !Switcher._context.exp ||
      Date.now() > (Switcher._context.exp * 1000)
    ) {
      await Switcher._auth();
    }

    const snapshot = await validateSnapshot(
      Switcher._get(Switcher._context.url, ''),
      Switcher._get(Switcher._context.token, ''),
      Switcher._get(Switcher._context.domain, ''),
      Switcher._get(Switcher._context.environment, DEFAULT_ENVIRONMENT),
      Switcher._get(Switcher._context.component, ''),
      Switcher._snapshot.data.domain.version,
    );

    if (snapshot) {
      if (Switcher._options.snapshotLocation?.length) {
        Deno.writeTextFileSync(
          `${Switcher._options.snapshotLocation}/${Switcher._context.environment}.json`,
          snapshot,
        );
      }

      Switcher._snapshot = JSON.parse(snapshot);
      return true;
    }

    return false;
  }

  /**
   * Read snapshot and load it into memory
   *
   * @param watchSnapshot enable watchSnapshot when true
   */
  static async loadSnapshot(
    watchSnapshot = false,
    fetchRemote = false,
  ): Promise<number> {
    Switcher._snapshot = loadDomain(
      Switcher._get(Switcher._options.snapshotLocation, ''),
      Switcher._get(Switcher._context.environment, DEFAULT_ENVIRONMENT),
    );

    if (
      Switcher._snapshot?.data.domain.version == 0 &&
      (fetchRemote || !Switcher._options.local)
    ) {
      await Switcher.checkSnapshot();
    }

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }

    return Switcher._snapshot?.data.domain.version || 0;
  }

  /**
   * Start watching snapshot files for modifications
   *
   * @param success when snapshot has successfully updated
   * @param error when any error has thrown when attempting to load snapshot
   */
  static async watchSnapshot(
    success: () => void | Promise<void> = () => {},
    error: (err: Error) => void = () => {},
  ): Promise<void> {
    if (Switcher._testEnabled || !Switcher._options.snapshotLocation?.length) {
      return error(new Error('Watch Snapshot cannot be used in test mode or without a snapshot location'));
    }

    const snapshotFile = `${Switcher._options.snapshotLocation}/${Switcher._context.environment}.json`;
    Switcher._watcher = Deno.watchFs(snapshotFile);
    Switcher._watching = true;
    for await (const event of Switcher._watcher) {
      const dataString = JSON.stringify(event);
      if (Switcher._watchDebounce.has(dataString)) {
        clearTimeout(Switcher._watchDebounce.get(dataString));
        Switcher._watchDebounce.delete(dataString);
      }

      Switcher._watchDebounce.set(
        dataString,
        setTimeout(() => Switcher._onModifySnapshot(dataString, event, success, error), 20),
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
    if (Switcher._watcher && Switcher._watching) {
      Switcher._watching = false;
      Switcher._watcher.close();
    }
  }

  /**
   * Schedule Snapshot auto update.
   * It can also be configured using SwitcherOptions 'snapshotAutoUpdateInterval' when
   * building context
   *
   * @param interval in ms
   */
  static scheduleSnapshotAutoUpdate(
    interval?: number,
    success?: (updated: boolean) => void,
    reject?: (err: Error) => void,
  ) {
    if (interval) {
      Switcher._options.snapshotAutoUpdateInterval = interval;
    }

    if (Switcher._options.snapshotAutoUpdateInterval && Switcher._options.snapshotAutoUpdateInterval > 0) {
      SnapshotAutoUpdater.schedule(Switcher._options.snapshotAutoUpdateInterval, this.checkSnapshot, success, reject);
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
    if (Switcher._options.local && Switcher._snapshot) {
      checkSwitchersLocal(Switcher._snapshot, switcherKeys);
    } else {
      await Switcher.checkSwitchersRemote(switcherKeys);
    }
  }

  private static async checkSwitchersRemote(switcherKeys: string[]) {
    try {
      await Switcher._auth();
      await remote.checkSwitchers(
        Switcher._get(Switcher._context.url, ''),
        Switcher._context.token,
        switcherKeys,
      );
    } catch (err) {
      if (Switcher._options.silentMode && Switcher._snapshot) {
        checkSwitchersLocal(Switcher._snapshot, switcherKeys);
      } else {
        throw err;
      }
    }
  }

  private static _onModifySnapshot(
    dataString: string,
    event: Deno.FsEvent,
    success: () => void | Promise<void>,
    error: (err: Error) => void,
  ) {
    Switcher._watchDebounce.delete(dataString);
    if (event.kind === 'modify') {
      try {
        Switcher._snapshot = loadDomain(
          Switcher._get(Switcher._options.snapshotLocation, ''),
          Switcher._get(Switcher._context.environment, DEFAULT_ENVIRONMENT),
        );

        success();
      } catch (err) {
        error(err);
      }
    }
  }

  private static _initSilentMode(silentMode: string) {
    this._retryOptions = {
      retryTime: parseInt(silentMode.slice(0, -1)),
      retryDurationIn: silentMode.slice(-1),
    };

    this._options.silentMode = silentMode;
    this.loadSnapshot();
  }

  private static _initTimedMatch(options: SwitcherOptions) {
    if (SWITCHER_OPTIONS.REGEX_MAX_BLACK_LIST in options) {
      TimedMatch.setMaxBlackListed(Switcher._get(options.regexMaxBlackList, DEFAULT_REGEX_MAX_BLACKLISTED));
    }

    if (SWITCHER_OPTIONS.REGEX_MAX_TIME_LIMIT in options) {
      TimedMatch.setMaxTimeLimit(Switcher._get(options.regexMaxTimeLimit, DEFAULT_REGEX_MAX_TIME_LIMIT));
    }

    const hasRegexSafeOption = SWITCHER_OPTIONS.REGEX_SAFE in options;
    if (!hasRegexSafeOption || (hasRegexSafeOption && options.regexSafe)) {
      TimedMatch.initializeWorker();
    }
  }

  private static async _auth() {
    const response = await remote.auth(Switcher._context);
    Switcher._context.token = response.token;
    Switcher._context.exp = response.exp;
  }

  private static _checkHealth() {
    if (Switcher._context.token !== 'SILENT') {
      return;
    }

    if (Switcher._isTokenExpired()) {
      Switcher._updateSilentToken();
      remote.checkAPIHealth(Switcher._get(Switcher._context.url, ''))
        .then((isAlive) => {
          if (isAlive) {
            Switcher._auth();
          }
        });
    }
  }

  private static _updateSilentToken() {
    const expirationTime = new DateMoment(new Date())
      .add(Switcher._retryOptions.retryTime, Switcher._retryOptions.retryDurationIn).getDate();

    Switcher._context.token = 'SILENT';
    Switcher._context.exp = Math.round(expirationTime.getTime() / 1000);
  }

  private static _isTokenExpired() {
    return !Switcher._context.exp || Date.now() > (Switcher._context.exp * 1000);
  }

  private static _get<T>(value: T | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   *
   * @param key
   */
  static assume(key: string): Key {
    return Bypasser.assume(key);
  }

  /**
   * Remove forced value from a switcher
   *
   * @param key
   */
  static forget(key: string): void {
    return Bypasser.forget(key);
  }

  /**
   * Retrieve execution log given a switcher key
   *
   * @param key
   */
  static getLogger(key: string): ExecutionLogger[] {
    return ExecutionLogger.getByKey(key);
  }

  /**
   * Clear all results from the execution log
   */
  static clearLogger(): void {
    ExecutionLogger.clearLogger();
  }

  /**
   * Enable/Disable test mode
   * It prevents from watching Snapshots that may hold process
   */
  static testMode(testEnabled: boolean = true): void {
    Switcher._testEnabled = testEnabled;
  }

  /**
   * Pre-set input values before calling the API
   *
   * @param key
   * @param input
   */
  async prepare(key: string, input?: string[][]): Promise<void> {
    this._key = key;

    if (input) this._input = input;

    if (!Switcher._options.local || this._forceRemote) {
      await Switcher._auth();
    }
  }

  /**
   * Validate the input provided to access the API
   */
  async validate(): Promise<void> {
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
   */
  async isItOn(key?: string, input?: string[][]): Promise<boolean | ResultDetail> {
    let result: boolean | ResultDetail;
    this._validateArgs(key, input);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse();
      return this._showDetail ? response : response.result;
    }

    // verify if query from snapshot
    if (Switcher._options.local && !this._forceRemote) {
      result = await this._executeLocalCriteria();
    } else {
      try {
        await this.validate();
        if (Switcher._context.token === 'SILENT') {
          result = await this._executeLocalCriteria();
        } else {
          result = await this._executeRemoteCriteria();
        }
      } catch (err) {
        Switcher._notifyError(err);

        if (Switcher._options.silentMode) {
          Switcher._updateSilentToken();
          return this._executeLocalCriteria();
        }

        throw err;
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
  throttle(delay: number): this {
    this._delay = delay;

    if (delay > 0) {
      Switcher._options.logger = true;
    }

    return this;
  }

  /**
   * Force the use of the remote API when local is enabled
   *
   * @param forceRemote default true
   */
  remote(forceRemote = true): this {
    if (!Switcher._options.local) {
      throw new Error('Local mode is not enabled');
    }

    this._forceRemote = forceRemote;
    return this;
  }

  /**
   * When enabled, isItOn will return a ResultDetail object
   */
  detail(showDetail = true): this {
    this._showDetail = showDetail;
    return this;
  }

  async _executeRemoteCriteria(): Promise<boolean | ResultDetail> {
    let responseCriteria: ResultDetail;

    if (this._useSync()) {
      responseCriteria = await remote.checkCriteria(
        Switcher._context,
        this._key,
        this._input,
        this._showDetail,
      );

      if (Switcher._options.logger && this._key) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }
    } else {
      responseCriteria = this._executeAsyncRemoteCriteria();
    }

    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  _executeAsyncRemoteCriteria(): ResultDetail {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;

      if (Switcher._isTokenExpired()) {
        this.prepare(this._key, this._input)
          .then(() => this.executeAsyncCheckCriteria())
          .catch((err) => Switcher._notifyError(err));
      } else {
        this.executeAsyncCheckCriteria();
      }
    }

    const executionLog = ExecutionLogger.getExecution(this._key, this._input);
    return executionLog.response;
  }

  private executeAsyncCheckCriteria() {
    remote.checkCriteria(Switcher._context, this._key, this._input, this._showDetail)
      .then((response) => ExecutionLogger.add(response, this._key, this._input))
      .catch((err) => Switcher._notifyError(err));
  }

  private static _notifyError(err: Error) {
    ExecutionLogger.notifyError(err);
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

  private async _executeApiValidation() {
    if (!this._useSync()) {
      return;
    }

    Switcher._checkHealth();
    if (Switcher._isTokenExpired()) {
      await this.prepare(this._key, this._input);
    }
  }

  async _executeLocalCriteria(): Promise<
    boolean | {
      result: boolean;
      reason: string;
    }
  > {
    const response = await checkCriteriaLocal(
      Switcher._snapshot,
      Switcher._get(this._key, ''),
      Switcher._get(this._input, []),
    );

    if (Switcher._options.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    if (this._showDetail) {
      return response;
    }

    return response.result;
  }

  private _validateArgs(key?: string, input?: string[][]) {
    if (key) this._key = key;
    if (input) this._input = input;
  }

  private _useSync() {
    return this._delay == 0 || !ExecutionLogger.getExecution(this._key, this._input);
  }

  get key(): string {
    return this._key;
  }

  get input(): string[][] | undefined {
    return this._input;
  }

  get nextRun(): number {
    return this._nextRun;
  }

  static get snapshot(): Snapshot | undefined {
    return Switcher._snapshot;
  }
}
