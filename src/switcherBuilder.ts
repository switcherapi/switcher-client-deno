import { StrategiesType } from './lib/snapshot.ts';
import { GlobalOptions } from './lib/globals/globalOptions.ts';

export class SwitcherBuilder {
  protected _delay = 0;
  protected _nextRefreshTime = 0;
  protected _input?: string[][];
  protected _key = '';
  protected _defaultResult: boolean | undefined;
  protected _forceRemote = false;
  protected _showDetail = false;
  protected _restrictRelay = true;

  constructor(key: string) {
    this._key = key;
  }

  /**
   * Define a delay (ms) for the next async execution.
   *
   * Activating this option will enable logger by default
   */
  throttle(delay: number): this {
    this._delay = delay;

    if (this._nextRefreshTime === 0) {
      this._nextRefreshTime = Date.now() + delay;
    }

    if (delay > 0) {
      GlobalOptions.updateOptions({ logger: true });
    }

    return this;
  }

  /**
   * Force the use of the remote API when local is enabled
   */
  remote(forceRemote = true): this {
    if (!GlobalOptions.local) {
      throw new Error('Local mode is not enabled');
    }

    this._forceRemote = forceRemote;
    return this;
  }

  /**
   * When enabled, isItOn will return a SwitcherResult object
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
   * Allow local snapshots to ignore or require Relay verification.
   */
  restrictRelay(restrict = true): this {
    this._restrictRelay = restrict;
    return this;
  }

  /**
   * Resets all strategy inputs
   */
  resetInputs(): this {
    this._input = undefined;
    return this;
  }

  /**
   * Adds a strategy for validation
   */
  check(strategyType: string, input: string): this {
    if (!this._input) {
      this._input = [];
    }

    // replace existing strategyType input
    this._input = this._input.filter((item) => item[0] !== strategyType);
    this._input.push([strategyType, input]);
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
}
