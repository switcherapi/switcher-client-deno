import { StrategiesType } from '../snapshot.ts';

/**
 * Criteria defines a set of conditions (when) that are used to evaluate the bypasser strategies
 */
export default class Criteria {
  private readonly when: Map<string, string[]>;

  constructor(strategy: string, input: string | string[]) {
    this.when = new Map();
    this.when.set(strategy, Array.isArray(input) ? input : [input]);
  }

  /**
   * Add a new strategy/input to the criteria
   */
  and(strategy: string, input: string | string[]): this {
    if (Object.values(StrategiesType).filter((s) => s === strategy).length) {
      this.when.set(strategy, Array.isArray(input) ? input : [input]);
    }

    return this;
  }

  getWhen(): Map<string, string[]> {
    return this.when;
  }
}
