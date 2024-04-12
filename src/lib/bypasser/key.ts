/**
 * Type definition for Switcher Keys which are used to mock results
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
  true() {
    this.result = true;
    this.reaason = 'Forced to true';
    return this;
  }

  /**
   * Force result to false
   */
  false() {
    this.result = false;
    this.reaason = 'Forced to false';
    return this;
  }

  /**
   * Define metadata for the response
   */
  withMetadata(metadata: object) {
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
  getResponse() {
    return {
      result: this.result,
      reason: this.reaason,
      metadata: this.metadata,
    };
  }
}
