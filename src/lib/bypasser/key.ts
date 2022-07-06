/**
 * Type definition for Switcher Keys which are used to mock results
 */
export default class Key {
  key: string;
  value?: boolean;

  constructor(key: string) {
    this.key = key;
    this.value = undefined;
  }

  /**
   * Force result to true
   */
  true(): void {
    this.value = true;
  }

  /**
   * Force result to false
   */
  false(): void {
    this.value = false;
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
  getValue(): boolean | undefined {
    return this.value;
  }
}
