import Key from "./key.ts";

const bypassedKeys: Key[] = [];

export default class Bypasser {
  /**
   * Force a switcher value to return a given value by calling one of both methods - true() false()
   *
   * @param key
   */
  static assume(key: string): Key {
    const existentKey = this.searchBypassed(key);
    if (existentKey) {
      return existentKey;
    }

    const keyBypassed = new Key(key);
    bypassedKeys.push(keyBypassed);
    return keyBypassed;
  }

  /**
   * Remove forced value from a switcher
   *
   * @param key
   */
  static forget(key: string) {
    const keyStored = this.searchBypassed(key);

    if (keyStored) {
      bypassedKeys.splice(
        bypassedKeys.indexOf(keyStored),
        1,
      );
    }
  }

  /**
   * Search for key registered via 'assume'
   *
   * @param key
   */
  static searchBypassed(key: string): Key | undefined {
    for (const bypassed of bypassedKeys) {
      if (bypassed.key === key) {
        return bypassed;
      }
    }

    return undefined;
  }
}
