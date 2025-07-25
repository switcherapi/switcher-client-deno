import type { SwitcherOptions } from '../../types/index.d.ts';

export class GlobalOptions {
  private static options: SwitcherOptions;

  static init(options: SwitcherOptions) {
    this.options = {
      ...options,
    };
  }

  static updateOptions(options: SwitcherOptions) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  static get local() {
    return this.options.local;
  }

  static get freeze() {
    return this.options.freeze;
  }

  static get logger() {
    return this.options.logger;
  }

  static get snapshotLocation() {
    return this.options.snapshotLocation;
  }

  static get snapshotAutoUpdateInterval() {
    return this.options.snapshotAutoUpdateInterval;
  }

  static get silentMode() {
    return this.options.silentMode;
  }

  static get restrictRelay() {
    return this.options.restrictRelay;
  }
}
