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

/**
 * Switcher handles criteria execution and validations.
 *
 * Create a intance of Switcher using Client.getSwitcher()
 */
export class Switcher extends SwitcherBuilder implements SwitcherRequest {
  constructor(key: string) {
    super(key);
    this._validateArgs(key);
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
   * Execute criteria
   *
   * @returns boolean or SwitcherResult when detail() is used
   */
  isItOn(key?: string): Promise<boolean | SwitcherResult> | boolean | SwitcherResult {
    this._validateArgs(key);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this._showDetail ? response : response.result;
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
      queueMicrotask(() => this._submit().catch((err) => this._notifyError(err)));
    }
  }

  /**
   * Execute criteria from remote API
   */
  async executeRemoteCriteria(): Promise<boolean | SwitcherResult> {
    let responseCriteria: SwitcherResult;

    try {
      responseCriteria = await remote.checkCriteria(
        this._key,
        this._input,
        this._showDetail,
      );
    } catch (err) {
      responseCriteria = this.getDefaultResultOrThrow(err as Error);
    }

    if (GlobalOptions.logger && this._key) {
      ExecutionLogger.add(responseCriteria, this._key, this._input);
    }

    return this._showDetail ? responseCriteria : responseCriteria.result;
  }

  /**
   * Execute criteria from local snapshot
   */
  async executeLocalCriteria(): Promise<boolean | SwitcherResult> {
    let response: SwitcherResult;

    try {
      response = await checkCriteriaLocal(GlobalSnapshot.snapshot, this);
    } catch (err) {
      response = this.getDefaultResultOrThrow(err as Error);
    }

    if (GlobalOptions.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    if (this._showDetail) {
      return response;
    }

    return response.result;
  }

  /**
   * Submit criteria for execution (local or remote)
   */
  private async _submit() {
    try {
      // verify if query from snapshot
      if (GlobalOptions.local && !this._forceRemote) {
        return await this.executeLocalCriteria();
      }

      // otherwise, execute remote criteria or local snapshot when silent mode is enabled
      await this.validate();
      if (GlobalAuth.token === 'SILENT') {
        return await this.executeLocalCriteria();
      }

      return await this.executeRemoteCriteria();
    } catch (err) {
      this._notifyError(err as Error);

      if (GlobalOptions.silentMode) {
        Auth.updateSilentToken();
        return this.executeLocalCriteria();
      }

      throw err;
    }
  }

  private _tryCachedResult(): SwitcherResult | boolean | undefined {
    if (this._hasThrottle()) {
      if (!GlobalOptions.static) {
        this.scheduleBackgroundRefresh();
      }

      const cachedResultLogger = ExecutionLogger.getExecution(this._key, this._input);
      if (cachedResultLogger.key) {
        return this._showDetail ? cachedResultLogger.response : cachedResultLogger.response.result;
      }
    }

    return undefined;
  }

  private _notifyError(err: Error) {
    ExecutionLogger.notifyError(err);
  }

  private async _executeApiValidation() {
    Auth.checkHealth();
    if (Auth.isTokenExpired()) {
      await this.prepare(this._key);
    }
  }

  private _validateArgs(key?: string) {
    if (key) {
      this._key = key;
    }
  }

  private _hasThrottle(): boolean {
    return this._delay !== 0;
  }

  private getDefaultResultOrThrow(err: Error): SwitcherResult {
    if (this._defaultResult === undefined) {
      throw err;
    }

    const response = SwitcherResult.create(this._defaultResult, 'Default result');

    this._notifyError(err);
    return response;
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
