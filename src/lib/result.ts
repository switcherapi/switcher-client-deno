/**
 * SwitcherResult represents the result of the criteria evaluation.
 * It represents:
 *
 * - `result`: a boolean indicating if the criteria was met.
 * - `reason`: an optional string providing a reason for the result.
 * - `metadata`: an optional object containing additional metadata about the result.
 */
export class SwitcherResult {
  private readonly _result: boolean;
  private readonly _reason?: string;
  private readonly _metadata?: object;

  constructor(result: boolean = false, reason?: string, metadata?: object) {
    this._result = result;
    this._reason = reason;
    this._metadata = metadata;
  }

  static create(result = false, reason?: string, metadata?: object): SwitcherResult {
    return new SwitcherResult(result, reason, metadata);
  }

  static enabled(reason = 'Success', metadata?: object): SwitcherResult {
    return new SwitcherResult(true, reason, metadata);
  }

  static disabled(reason?: string, metadata?: object): SwitcherResult {
    return new SwitcherResult(false, reason, metadata);
  }

  /**
   * Returns the object as a JSON representation
   * This method is automatically called when JSON.stringify() is used
   */
  toJSON(): object {
    return {
      result: this._result,
      reason: this._reason,
      metadata: this._metadata,
    };
  }

  /**
   * @returns {boolean} - Returns true if the result is successful.
   */
  get result(): boolean {
    return this._result;
  }

  /**
   * @returns {string | undefined} - Returns the reason for the result, if any.
   */
  get reason(): string | undefined {
    return this._reason;
  }

  /**
   * @returns {object | undefined} - Returns additional metadata about the result, if any.
   */
  get metadata(): object | undefined {
    return this._metadata;
  }
}
