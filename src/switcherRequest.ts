export interface SwitcherRequest {
  /**
   * Return switcher key
   */
  get key(): string | undefined;

  /**
   * Return switcher current strategy input
   */
  get input(): string[][] | undefined;

  /**
   * Return Relay restriction value
   */
  get isRelayRestricted(): boolean;
}
