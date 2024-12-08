import Criteria from './criteria.ts';

/**
 * Key record used to store key response when bypassing criteria execution
 */
export default class Key {
  private readonly key: string;
  private result: boolean;
  private reason?: string;
  private metadata?: object;
  private criteria?: Criteria;

  constructor(key: string) {
    this.key = key;
    this.result = false;
  }

  /**
   * Force result to true
   */
  true(): this {
    this.result = true;
    this.reason = 'Forced to true';
    return this;
  }

  /**
   * Force result to false
   */
  false(): this {
    this.result = false;
    this.reason = 'Forced to false';
    return this;
  }

  /**
   * Define metadata for the response
   */
  withMetadata(metadata: object): this {
    this.metadata = metadata;
    return this;
  }

  /**
   * Conditionally set result based on strategy
   */
  when(strategy: string, input: string | string[]): Criteria {
    this.criteria = new Criteria(strategy, input);
    return this.criteria;
  }

  /**
   * Return selected switcher name
   */
  getKey(): string {
    return this.key;
  }

  /**
   * Return key response
   */
  getResponse(input?: string[][]): {
    result: boolean;
    reason: string | undefined;
    metadata: object | undefined;
  } {
    let result = this.result;
    if (this.criteria && input) {
      result = this.getResultBasedOnCriteria(this.criteria, input);
    }

    return {
      result,
      reason: this.reason,
      metadata: this.metadata,
    };
  }

  private getResultBasedOnCriteria(criteria: Criteria, input: string[][]): boolean {
    for (const [strategyWhen, inputWhen] of criteria.getWhen()) {
      const entry = input.filter((e) => e[0] === strategyWhen);
      if (entry.length && !inputWhen.includes(entry[0][1])) {
        this.reason = `Forced to ${!this.result} when: [${inputWhen}] - input: ${entry[0][1]}`;
        return !this.result;
      }
    }

    return this.result;
  }
}
