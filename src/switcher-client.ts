// deno-lint-ignore-file no-explicit-any
import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import DateMoment from './lib/utils/datemoment.ts';
import { checkSwitchers, loadDomain, validateSnapshot } from './lib/snapshot.ts';
import * as services from './lib/remote.ts';
import checkCriteriaOffline from './lib/resolver.ts';

const DEFAULT_URL = 'https://switcher-api.herokuapp.com';
const DEFAULT_ENVIRONMENT = 'default';
const DEFAULT_SNAPSHOT_LOCATION = './snapshot/';
const DEFAULT_RETRY_TIME = '5m';
const DEFAULT_OFFLINE = false;
const DEFAULT_LOGGER = false;
const DEFAULT_TEST_MODE = false;

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

  private static _snapshot: any;
  private static _context: any;
  private static _options: any;

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
  static buildContext(context: any, options?: any) {
    this._testEnabled = DEFAULT_TEST_MODE;

    this._snapshot = undefined;
    this._context = {};
    this._context = context;
    this._context.environment = context.environment || DEFAULT_ENVIRONMENT;
    this._context.url = context.url || DEFAULT_URL;

    // Default values
    this._options = {};
    this._options.offline = DEFAULT_OFFLINE;
    this._options.snapshotLocation = DEFAULT_SNAPSHOT_LOCATION;
    this._options.logger = DEFAULT_LOGGER;

    if (options) {
      if ('offline' in options) {
        this._options.offline = options.offline;
      }

      if ('snapshotLocation' in options) {
        this._options.snapshotLocation = options.snapshotLocation;
      }

      if ('silentMode' in options) {
        this._options.silentMode = options.silentMode;
        this.loadSnapshot();
      }

      if ('logger' in options) {
        this._options.logger = options.logger;
      }

      if ('retryAfter' in options) {
        this._options.retryTime = options.retryAfter.slice(0, -1);
        this._options.retryDurationIn = options.retryAfter.slice(-1);
      } else {
        this._options.retryTime = DEFAULT_RETRY_TIME.charAt(0);
        this._options.retryDurationIn = DEFAULT_RETRY_TIME.charAt(1);
      }
    }
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
    }

    return false;
  }

  /**
   * Read snapshot file locally and store in a parsed JSON object
   *
   * @param watchSnapshot enable watchSnapshot when true
   */
  static async loadSnapshot(watchSnapshot?: boolean) {
    Switcher._snapshot = loadDomain(
      Switcher._options.snapshotLocation,
      Switcher._context.environment,
    );
    if (
      Switcher._snapshot.data.domain.version == 0 &&
      !Switcher._options.offline
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
  static async watchSnapshot(success?: any, error?: any): Promise<void> {
    if (Switcher._testEnabled) {
      return;
    }

    Switcher._watcher = Deno.watchFs(`${Switcher._options.snapshotLocation}${Switcher._context.environment}.json`);
    for await (const event of Switcher._watcher) {
      const dataString = JSON.stringify(event);
      if (Switcher._watchDebounce.has(dataString)) {
        clearTimeout(Switcher._watchDebounce.get(dataString));
        Switcher._watchDebounce.delete(dataString);
      }

      Switcher._watchDebounce.set(
        dataString,
        setTimeout(() => {
          Switcher._watchDebounce.delete(dataString);
          if (event.kind === 'modify') {
            try {
              Switcher._snapshot = loadDomain(
                Switcher._options.snapshotLocation,
                Switcher._context.environment,
              );

              if (success) success();
            } catch (e) {
              if (error) error(e);
            }
          }
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
   * Verifies if switchers are properly configured
   *
   * @param switcherKeys Switcher Keys
   * @throws when one or more Switcher Keys were not found
   */
  static async checkSwitchers(switcherKeys: string[]) {
    if (Switcher._options.offline) {
      checkSwitchers(Switcher._snapshot, switcherKeys);
    } else {
      await Switcher._auth();
      await services.checkSwitchers(
        Switcher._context.url,
        Switcher._context.token,
        switcherKeys,
      );
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
            Switcher._options.retryTime,
            Switcher._options.retryDurationIn,
          )
          .getDate();

        Switcher._context.exp = expirationTime.getTime() / 1000;
        return false;
      }
    }

    const response = await services.checkAPIHealth(Switcher._context.url, {
      silentMode: Switcher._options.silentMode,
      retryTime: Switcher._options.retryTime,
      retryDurationIn: Switcher._options.retryDurationIn,
    });

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
  async isItOn(key?: string, input?: string[][], showReason = false) {
    let result;
    this._validateArgs(key, input);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      return bypassKey.getValue();
    }

    // verify if query from snapshot
    if (Switcher._options.offline) {
      result = this._executeOfflineCriteria();
    } else {
      await this.validate();
      if (Switcher._context.token === 'SILENT') {
        result = this._executeOfflineCriteria();
      } else {
        result = await this._executeOnlineCriteria(showReason);
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

    return ExecutionLogger.getExecution(this._key, this._input).response
      .result;
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

  _executeOfflineCriteria() {
    const response = checkCriteriaOffline(
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
