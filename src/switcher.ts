import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import checkCriteriaLocal from './lib/resolver.ts';
import type { SwitcherRequest } from './switcherRequest.ts';
import * as remote from './lib/remote.ts';
import * as util from './lib/utils/index.ts';
import { Auth } from './lib/remoteAuth.ts';
import { SwitcherResult } from './lib/result.ts';
import { GlobalOptions } from './lib/globals/globalOptions.ts';
import { GlobalSnapshot } from './lib/globals/globalSnapshot.ts';
import { GlobalAuth } from './lib/globals/globalAuth.ts';
import { SwitcherBuilder } from './switcherBuilder.ts';

export type SwitcherExecutionResult = Promise<boolean | SwitcherResult> | boolean | SwitcherResult;

/**
 * Switcher handles criteria execution and validations.
 *
 * The class provides methods to execute criteria with both boolean and detailed results,
 * and supports both synchronous and asynchronous execution modes.
 *
 * @example
 * Example usage of the Switcher class:
 * ```typescript
 * // Local mode - synchronous execution
 * const isOn = switcher.isItOnBool();
 * const { result, reason, metadata } = switcher.isItOnDetail();
 *
 * // Force asynchronous execution
 * const isOnAsync = await switcher.isItOnBool('MY_SWITCHER', true);
 * const detailAsync = await switcher.isItOnDetail('MY_SWITCHER', true);
 * ```
 */
export class Switcher extends SwitcherBuilder implements SwitcherRequest {
  constructor(key: string) {
    super(key);
    this._validateArgs(key);
  }

  /**
   * Execute criteria with boolean result (synchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns boolean value
   */
  isItOnBool(key: string, forceAsync?: false): boolean;

  /**
   * Execute criteria with boolean result (asynchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<boolean> value
   */
  isItOnBool(key: string, forceAsync?: true): Promise<boolean>;

  /**
   * Execute criteria with boolean result
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns boolean value or Promise<boolean> based on execution mode
   */
  isItOnBool(key: string, forceAsync?: boolean): Promise<boolean> | boolean {
    this.detail(false);

    if (forceAsync) {
      return this.isItOn(key) as Promise<boolean>;
    }

    return this.isItOn(key) as boolean;
  }

  /**
   * Execute criteria with detail information (synchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns SwitcherResult object
   */
  isItOnDetail(key: string, forceAsync?: false): SwitcherResult;

  /**
   * Execute criteria with detail information (asynchronous version)
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns Promise<SwitcherResult> object
   */
  isItOnDetail(key: string, forceAsync?: true): Promise<SwitcherResult>;

  /**
   * Execute criteria with detail information
   *
   * @param key - switcher key
   * @param forceAsync - when true, forces async execution
   * @returns SwitcherResult or Promise<SwitcherResult> based on execution mode
   */
  isItOnDetail(key: string, forceAsync?: boolean): Promise<SwitcherResult> | SwitcherResult {
    this.detail(true);

    if (forceAsync) {
      return this.isItOn(key) as Promise<SwitcherResult>;
    }

    return this.isItOn(key) as SwitcherResult;
  }

  /**
   * Execute criteria
   *
   * @param key - switcher key
   * @returns {SwitcherExecutionResult} - boolean value or SwitcherResult when detail() is applied
   */
  isItOn(key?: string): SwitcherExecutionResult {
    this._validateArgs(key);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this._transformResult(response);
    }

    // try to get cached result
    const cachedResult = this._tryCachedResult();
    if (cachedResult) {
      return cachedResult;
    }

    return this._submit();
  }

  /**
   * Schedules background refresh of the last criteria request
   */
  scheduleBackgroundRefresh(): void {
    const now = Date.now();

    if (now > this._nextRefreshTime) {
      this._nextRefreshTime = now + this._delay;
      queueMicrotask(async () => {
        try {
          await this._submit();
        } catch (err) {
          this._notifyError(err as Error);
        }
      });
    }
  }

  /**
   * Execute criteria from remote API
   */
  async executeRemoteCriteria(): Promise<boolean | SwitcherResult> {
    return await remote.checkCriteria(
      this._key,
      this._input,
      this._showDetail,
    ).then((responseCriteria) => {
      if (this._canLog()) {
        ExecutionLogger.add(responseCriteria, this._key, this._input);
      }

      return this._transformResult(responseCriteria);
    }).catch((err) => {
      const responseCriteria = this._getDefaultResultOrThrow(err as Error);
      return this._transformResult(responseCriteria);
    });
  }

  /**
   * Execute criteria from local snapshot
   */
  executeLocalCriteria(): boolean | SwitcherResult {
    try {
      const response = checkCriteriaLocal(GlobalSnapshot.snapshot, this);
      if (this._canLog()) {
        ExecutionLogger.add(response, this._key, this._input);
      }

      return this._transformResult(response);
    } catch (err) {
      const response = this._getDefaultResultOrThrow(err as Error);
      return this._transformResult(response);
    }
  }

  /**
   * Checks API credentials and connectivity
   */
  async prepare(key?: string): Promise<void> {
    this._validateArgs(key);

    if (!GlobalOptions.local || this._forceRemote) {
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
    if (!GlobalAuth.token) {
      errors.push('Missing token field');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }
  }

  /**
   * Submit criteria for execution (local or remote)
   */
  private _submit(): SwitcherExecutionResult {
    // verify if query from snapshot
    if (GlobalOptions.local && !this._forceRemote) {
      return this.executeLocalCriteria();
    }

    // otherwise, execute remote criteria or local snapshot when silent mode is enabled
    return this.validate()
      .then(() => {
        if (GlobalAuth.token === 'SILENT') {
          return this.executeLocalCriteria();
        }

        return this.executeRemoteCriteria();
      })
      .catch((err) => {
        this._notifyError(err as Error);

        if (GlobalOptions.silentMode) {
          Auth.updateSilentToken();
          return this.executeLocalCriteria();
        }

        throw err;
      });
  }

  private _tryCachedResult(): SwitcherResult | boolean | undefined {
    if (this._hasThrottle()) {
      if (!GlobalOptions.static) {
        this.scheduleBackgroundRefresh();
      }

      const cachedResultLogger = ExecutionLogger.getExecution(this._key, this._input);
      if (cachedResultLogger.key) {
        return this._transformResult(cachedResultLogger.response);
      }
    }

    return undefined;
  }

  private _notifyError(err: Error): void {
    ExecutionLogger.notifyError(err);
  }

  private async _executeApiValidation(): Promise<void> {
    Auth.checkHealth();
    if (Auth.isTokenExpired()) {
      await this.prepare(this._key);
    }
  }

  private _validateArgs(key?: string): void {
    if (key) {
      this._key = key;
    }
  }

  private _hasThrottle(): boolean {
    return this._delay !== 0;
  }

  private _canLog(): boolean {
    return GlobalOptions.logger === true && this._key.length > 0;
  }

  private _getDefaultResultOrThrow(err: Error): SwitcherResult {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = SwitcherResult.create(this._defaultResult, 'Default result');

    this._notifyError(err);
    return response;
  }

  private _transformResult(result: SwitcherResult): boolean | SwitcherResult {
    return this._showDetail ? result : result.result;
  }

  get key(): string {
    return this._key;
  }

  get input(): string[][] | undefined {
    return this._input;
  }

  get isRelayRestricted(): boolean {
    return this._restrictRelay;
  }
}
