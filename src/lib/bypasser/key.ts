/**
 * Key record used to store key response when bypassing criteria execution
 */
export default class Key {
  key: string;
  result: boolean;
  reaason?: string;
  metadata?: object;

  constructor(key: string) {
    this.key = key;
    this.result = false;
  }

  /**
   * Force result to true
   */
  true(): this {
    this.result = true;
    this.reaason = 'Forced to true';
    return this;
  }

  /**
   * Force result to false
   */
  false(): this {
    this.result = false;
    this.reaason = 'Forced to false';
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
   * Return selected switcher name
   */
  getKey(): string {
    return this.key;
  }

  /**
   * Return current value
   */
  getResponse(): {
    result: boolean;
    reason: string | undefined;
    metadata: object | undefined;
  } {
    return {
      result: this.result,
      reason: this.reaason,
      metadata: this.metadata,
    };
  }
}
