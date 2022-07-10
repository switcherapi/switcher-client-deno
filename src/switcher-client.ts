// deno-lint-ignore-file no-explicit-any
import Bypasser from "./lib/bypasser/index.ts";
import ExecutionLogger from "./lib/utils/executionLogger.ts";
import DateMoment from "./lib/utils/datemoment.ts";
import {
  checkSwitchers,
  loadDomain,
  validateSnapshot,
} from "./lib/snapshot.ts";
import * as services from "./lib/remote.ts";
import checkCriteriaOffline from "./lib/resolver.ts";

const DEFAULT_URL = "https://switcher-api.herokuapp.com";
const DEFAULT_ENVIRONMENT = "default";
const DEFAULT_SNAPSHOT_LOCATION = "./snapshot/";
const DEFAULT_RETRY_TIME = "5m";
const DEFAULT_OFFLINE = false;
const DEFAULT_LOGGER = false;
const DEFAULT_TEST_MODE = false;

export class Switcher {
  static testEnabled = DEFAULT_TEST_MODE;
  static snapshot: any;
  static context: any;
  static options: any;
  static watcher: Deno.FsWatcher;

  _delay = 0;
  _nextRun = 0;
  _input?: string[][];
  _key = "";

  static buildContext(context: any, options?: any) {
    this.testEnabled = DEFAULT_TEST_MODE;

    this.snapshot = undefined;
    this.context = {};
    this.context = context;
    this.context.environment = context.environment || DEFAULT_ENVIRONMENT;
    this.context.url = context.url || DEFAULT_URL;

    // Default values
    this.options = {};
    this.options.offline = DEFAULT_OFFLINE;
    this.options.snapshotLocation = DEFAULT_SNAPSHOT_LOCATION;
    this.options.logger = DEFAULT_LOGGER;

    if (options) {
      if ("offline" in options) {
        this.options.offline = options.offline;
      }

      if ("snapshotLocation" in options) {
        this.options.snapshotLocation = options.snapshotLocation;
      }

      if ("silentMode" in options) {
        this.options.silentMode = options.silentMode;
        this.loadSnapshot();
      }

      if ("logger" in options) {
        this.options.logger = options.logger;
      }

      if ("retryAfter" in options) {
        this.options.retryTime = options.retryAfter.slice(0, -1);
        this.options.retryDurationIn = options.retryAfter.slice(-1);
      } else {
        this.options.retryTime = DEFAULT_RETRY_TIME.charAt(0);
        this.options.retryDurationIn = DEFAULT_RETRY_TIME.charAt(1);
      }
    }
  }

  static factory() {
    return new Switcher();
  }

  static async checkSnapshot() {
    if (Switcher.snapshot) {
      if (!Switcher.context.exp || Date.now() > (Switcher.context.exp * 1000)) {
        await Switcher._auth();

        const result = await validateSnapshot(
          Switcher.context,
          Switcher.options.snapshotLocation,
          Switcher.snapshot.data.domain.version,
        );

        if (result) {
          Switcher.loadSnapshot();
          return true;
        }
      }
      return false;
    }
  }

  static async loadSnapshot(watchSnapshot?: boolean) {
    Switcher.snapshot = loadDomain(
      Switcher.options.snapshotLocation,
      Switcher.context.environment,
    );
    if (
      Switcher.snapshot.data.domain.version == 0 && !Switcher.options.offline
    ) {
      await Switcher.checkSnapshot();
    }

    if (watchSnapshot) {
      Switcher.watchSnapshot();
    }
  }

  static async watchSnapshot(success?: any, error?: any): Promise<void> {
    if (Switcher.testEnabled) {
      return;
    }

    const snapshotFile =
      `${Switcher.options.snapshotLocation}${Switcher.context.environment}.json`;

    Switcher.watcher = Deno.watchFs(snapshotFile);
    for await (const event of Switcher.watcher) {
      if (event.kind === "modify") {
        try {
          Switcher.snapshot = loadDomain(
            Switcher.options.snapshotLocation,
            Switcher.context.environment,
          );
          if (success) {
            success();
          }
        } catch (e) {
          if (error) {
            error(e);
          }
        }
      }
    }
  }

  static unloadSnapshot() {
    if (Switcher.testEnabled) {
      return;
    }

    Switcher.snapshot = undefined;
    if (Switcher.watcher?.rid in Deno.resources()) {
      Deno.close(Switcher.watcher.rid);
    }
  }

  static async checkSwitchers(switcherKeys: string[]) {
    if (Switcher.options.offline) {
      checkSwitchers(Switcher.snapshot, switcherKeys);
    } else {
      await Switcher._auth();
      await services.checkSwitchers(
        Switcher.context.url,
        Switcher.context.token,
        switcherKeys,
      );
    }
  }

  static async _auth() {
    const response = await services.auth(Switcher.context);
    Switcher.context.token = response.token;
    Switcher.context.exp = response.exp;
  }

  static async _checkHealth() {
    // checks if silent mode is still activated
    if (Switcher.context.token === "SILENT") {
      if (!Switcher.context.exp || Date.now() < (Switcher.context.exp * 1000)) {
        const expirationTime = new DateMoment(new Date())
          .add(Switcher.options.retryTime, Switcher.options.retryDurationIn)
          .getDate();

        Switcher.context.exp = expirationTime.getTime() / 1000;
        return false;
      }
    }

    const response = await services.checkAPIHealth(Switcher.context.url, {
      silentMode: Switcher.options.silentMode,
      retryTime: Switcher.options.retryTime,
      retryDurationIn: Switcher.options.retryDurationIn,
    });

    if (response) {
      Switcher.context.token = response.data.token;
      Switcher.context.exp = response.data.exp;
      return false;
    }

    return true;
  }

  static assume(key: string) {
    return Bypasser.assume(key);
  }

  static forget(key: string) {
    return Bypasser.forget(key);
  }

  static getLogger(key: string) {
    return ExecutionLogger.getByKey(key);
  }

  static clearLogger() {
    ExecutionLogger.clearLogger();
  }

  static setTestEnabled() {
    Switcher.testEnabled = true;
  }

  static setTestDisabled() {
    Switcher.testEnabled = false;
  }

  async prepare(key: string, input?: string[][]) {
    this._key = key;

    if (input) this._input = input;

    if (!Switcher.options.offline) {
      await Switcher._auth();
    }
  }

  async validate() {
    const errors = [];

    if (!Switcher.context.apiKey) {
      errors.push("Missing API Key field");
    }

    if (!Switcher.context.component) {
      errors.push("Missing component field");
    }

    if (!this._key) {
      errors.push("Missing key field");
    }

    await this._executeApiValidation();
    if (!Switcher.context.token) {
      errors.push("Missing token field");
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(", ")}`);
    }
  }

  async isItOn(key?: string, input?: string[][], showReason = false) {
    let result;
    this._validateArgs(key, input);

    // verify if query from Bypasser
    const bypassKey = Bypasser.searchBypassed(this._key);
    if (bypassKey) {
      return bypassKey.getValue();
    }

    // verify if query from snapshot
    if (Switcher.options.offline) {
      result = this._executeOfflineCriteria();
    } else {
      await this.validate();
      if (Switcher.context.token === "SILENT") {
        result = this._executeOfflineCriteria();
      } else {
        result = await this._executeOnlineCriteria(showReason);
      }
    }

    return result;
  }

  throttle(delay: number) {
    this._delay = delay;

    if (delay > 0) {
      Switcher.options.logger = true;
    }

    return this;
  }

  async _executeOnlineCriteria(showReason: boolean) {
    if (!this._useSync()) {
      return this._executeAsyncOnlineCriteria(showReason);
    }

    const responseCriteria = await services.checkCriteria(
      Switcher.context,
      this._key,
      this._input,
      showReason,
    );

    if (Switcher.options.logger && this._key) {
      ExecutionLogger.add(responseCriteria, this._key, this._input);
    }

    return responseCriteria.result;
  }

  _executeAsyncOnlineCriteria(showReason: boolean) {
    if (this._nextRun < Date.now()) {
      this._nextRun = Date.now() + this._delay;
      services.checkCriteria(
        Switcher.context,
        this._key,
        this._input,
        showReason,
      )
        .then((response) =>
          ExecutionLogger.add(response, this._key, this._input)
        );
    }

    return ExecutionLogger.getExecution(this._key, this._input).response.result;
  }

  async _executeApiValidation() {
    if (this._useSync()) {
      if (
        await Switcher._checkHealth() &&
        (!Switcher.context.exp || Date.now() > (Switcher.context.exp * 1000))
      ) {
        await this.prepare(this._key, this._input);
      }
    }
  }

  _executeOfflineCriteria() {
    const response = checkCriteriaOffline(
      Switcher.snapshot,
      this._key || "",
      this._input || [],
    );

    if (Switcher.options.logger) {
      ExecutionLogger.add(response, this._key, this._input);
    }

    return response.result;
  }

  _validateArgs(key?: string, input?: string[][]) {
    if (key) this._key = key;
    if (input) this._input = input;
  }

  _useSync() {
    return this._delay == 0 ||
      !ExecutionLogger.getExecution(this._key, this._input);
  }
}
