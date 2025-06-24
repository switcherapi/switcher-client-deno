import Bypasser from './lib/bypasser/index.ts';
import ExecutionLogger from './lib/utils/executionLogger.ts';
import checkCriteriaLocal from './lib/resolver.ts';
import type { ResultDetail } from './types/index.d.ts';
import type { SwitcherRequest } from './switcherRequest.ts';
import * as remote from './lib/remote.ts';
import * as util from './lib/utils/index.ts';
import { Auth } from './lib/remoteAuth.ts';
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
   * @returns boolean or ResultDetail when detail() is used
   */
  async isItOn(key?: string): Promise<boolean | ResultDetail> {
    let result: boolean | ResultDetail;
    this._validateArgs(key);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      const response = bypassKey.getResponse(util.get(this._input, []));
      return this._showDetail ? response : response.result;
    }

    try {
      // verify if query from snapshot
      if (GlobalOptions.local && !this._forceRemote) {
        return await this._executeLocalCriteria();
      }

      // otherwise, execute remote criteria or local snapshot when silent mode is enabled
      await this.validate();
      if (GlobalAuth.token === 'SILENT') {
        result = await this._executeLocalCriteria();
      } else {
        result = await this._executeRemoteCriteria();
      }
    } catch (err) {
      this._notifyError(err as Error);

      if (GlobalOptions.silentMode) {
        Auth.updateSilentToken();
        return this._executeLocalCriteria();
      }

      throw err;
    }

    return result;
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
        responseCriteria = this.getDefaultResultOrThrow(err as Error);
      }

      if (GlobalOptions.logger && this._key) {
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
