import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import checkCriteriaLocal from './lib/resolver.ts';
import { StrategiesType } from './lib/snapshot.ts';
import { Client } from './client.ts';
import type { ResultDetail } from './types/index.d.ts';
import * as remote from './lib/remote.ts';
import * as util from './lib/utils/index.ts';
import { Auth } from './lib/remote-auth.ts';

/**
 * Switcher handles criteria execution and validations.
 *
 * Create a intance of Switcher using Client.getSwitcher()
 */
export class Switcher {
  private _delay = 0;
  private _nextRun = 0;
  private _input?: string[][];
  private _key = '';
  private _defaultResult: boolean | undefined;
  private _forceRemote = false;
  private _showDetail = false;

  constructor(key: string) {
    this._validateArgs(key);
  }

  /**
   * Checks API credentials and connectivity
   */
  async prepare(key?: string): Promise<void> {
    this._validateArgs(key);

    if (!Client.options.local || this._forceRemote) {
      await Auth.auth();
    }
  }

  /**
   * Validates client settings for remote API calls
   */
  async validate(): Promise<void> {
    const errors = [];

    Auth.isValid();

    if (!this._key) {
      errors.push('Missing key field');
    }

    await this._executeApiValidation();
    if (!Auth.getToken()) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  /**
   * Execute criteria
   *
   * @returns boolean or ResultDetail when detail() is used
   */
  async isItOn(key?: string): Promise<boolean | ResultDetail> {
    let result: boolean | ResultDetail;
    this._validateArgs(key);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse();
      return this._showDetail ? response : response.result;
    }

    try {
      // verify if query from snapshot
      if (Client.options.local && !this._forceRemote) {
        return await this._executeLocalCriteria();
      }

      // otherwise, execute remote criteria or local snapshot when silent mode is enabled
      await this.validate();
      if (Auth.getToken() === 'SILENT') {
        result = await this._executeLocalCriteria();
      } else {
        result = await this._executeRemoteCriteria();
      }
    } catch (err) {
      this._notifyError(err);

      if (Client.options.silentMode) {
        Auth.updateSilentToken();
        return this._executeLocalCriteria();
      }

      throw err;
    }

    return result;
  }

  /**
   * Define a delay (ms) for the next async execution.
   *
   * Activating this option will enable logger by default
   */
  throttle(delay: number): this {
    this._delay = delay;

    if (delay > 0) {
      Client.options.logger = true;
    }

    return this;
  }

  /**
   * Force the use of the remote API when local is enabled
   */
  remote(forceRemote = true): this {
    if (!Client.options.local) {
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

  /**
   * Define a default result when the client enters in panic mode
   */
  defaultResult(defaultResult: boolean): this {
    this._defaultResult = defaultResult;
    return this;
  }

  /**
   * Adds a strategy for validation
   */
  check(startegyType: string, input: string): this {
    if (!this._input) {
      this._input = [];
    }

    this._input.push([startegyType, input]);
    return this;
  }

  /**
   * Adds VALUE_VALIDATION input for strategy validation
   */
  checkValue(input: string): this {
    return this.check(StrategiesType.VALUE, input);
  }

  /**
   * Adds NUMERIC_VALIDATION input for strategy validation
   */
  checkNumeric(input: string): this {
    return this.check(StrategiesType.NUMERIC, input);
  }

  /**
   * Adds NETWORK_VALIDATION input for strategy validation
   */
  checkNetwork(input: string): this {
    return this.check(StrategiesType.NETWORK, input);
  }

  /**
   * Adds DATE_VALIDATION input for strategy validation
   */
  checkDate(input: string): this {
    return this.check(StrategiesType.DATE, input);
  }

  /**
   * Adds TIME_VALIDATION input for strategy validation
   */
  checkTime(input: string): this {
    return this.check(StrategiesType.TIME, input);
  }

  /**
   * Adds REGEX_VALIDATION input for strategy validation
   */
  checkRegex(input: string): this {
    return this.check(StrategiesType.REGEX, input);
  }

  /**
   * Adds PAYLOAD_VALIDATION input for strategy validation
   */
  checkPayload(input: string): this {
    return this.check(StrategiesType.PAYLOAD, input);
  }

  /**
   * Execute criteria from remote API
   */
  async _executeRemoteCriteria(): Promise<boolean | ResultDetail> {
    let responseCriteria: ResultDetail;

    if (this._useSync()) {
      try {
        responseCriteria = await remote.checkCriteria(
          this._key,
          this._input,
          this._showDetail,
        );
      } catch (err) {
        responseCriteria = this.getDefaultResultOrThrow(err);
      }

      if (Client.options.logger && this._key) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }
    } else {
      responseCriteria = this._executeAsyncRemoteCriteria();
    }

    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  /**
   * Execute criteria from remote API asynchronously
   */
  _executeAsyncRemoteCriteria(): ResultDetail {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;

      if (Auth.isTokenExpired()) {
        this.prepare(this._key)
          .then(() => this.executeAsyncCheckCriteria())
          .catch((err) => this._notifyError(err));
      } else {
        this.executeAsyncCheckCriteria();
      }
    }

    const executionLog = ExecutionLogger.getExecution(this._key, this._input);
    return executionLog.response;
  }

  private executeAsyncCheckCriteria() {
    remote.checkCriteria(this._key, this._input, this._showDetail)
      .then((response) => ExecutionLogger.add(response, this._key, this._input))
      .catch((err) => this._notifyError(err));
  }

  private _notifyError(err: Error) {
    ExecutionLogger.notifyError(err);
  }

  private async _executeApiValidation() {
    if (!this._useSync()) {
      return;
    }

    Auth.checkHealth();
    if (Auth.isTokenExpired()) {
      await this.prepare(this._key);
    }
  }

  async _executeLocalCriteria(): Promise<boolean | ResultDetail> {
    let response: ResultDetail;

    try {
      response = await checkCriteriaLocal(
        Client.snapshot,
        util.get(this._key, ''),
        util.get(this._input, []),
      );
    } catch (err) {
      response = this.getDefaultResultOrThrow(err);
    }

    if (Client.options.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    if (this._showDetail) {
      return response;
    }

    return response.result;
  }

  private _validateArgs(key?: string) {
    if (key) {
      this._key = key;
    }
  }

  private _useSync() {
    return this._delay == 0 || !ExecutionLogger.getExecution(this._key, this._input);
  }

  private getDefaultResultOrThrow(err: Error): ResultDetail {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = {
      result: this._defaultResult,
      reason: 'Default result',
    };

    this._notifyError(err);
    return response;
  }

  /**
   * Return switcher key
   */
  get key(): string {
    return this._key;
  }

  /**
   * Return switcher current strategy input
   */
  get input(): string[][] | undefined {
    return this._input;
  }
}
