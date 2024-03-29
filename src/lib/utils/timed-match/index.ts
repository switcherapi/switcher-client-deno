import { DEFAULT_REGEX_MAX_BLACKLISTED, DEFAULT_REGEX_MAX_TIME_LIMIT } from '../../constants.ts';
import tryMatch from './match.ts';

/**
 * This class will run a match operation using a child process.
 * Workers should be killed given a specified (3000 ms default) time limit.
 * Blacklist caching is available to prevent sequence of matching failures and resource usage.
 */
export default class TimedMatch {
  private static worker: Worker;
  private static workerActive = false;
  private static blacklisted: Blacklist[] = [];
  private static maxBlackListed = DEFAULT_REGEX_MAX_BLACKLISTED;
  private static maxTimeLimit = DEFAULT_REGEX_MAX_TIME_LIMIT;

  /**
   * Initialize Worker process for working with Regex process operators
   */
  static initializeWorker() {
    this.worker = this.createChildProcess();
    this.workerActive = true;
  }

  /**
   * Gracefully terminate worker
   */
  static terminateWorker() {
    this.worker?.terminate();
    this.workerActive = false;
  }

  static async tryMatch(values: string[], input: string): Promise<boolean> {
    if (this.worker && this.workerActive) {
      return this.safeMatch(values, input);
    }

    return await Promise.resolve(tryMatch(values, input));
  }

  /**
   * Clear entries from failed matching operations
   */
  static clearBlackList() {
    this.blacklisted = [];
  }

  static setMaxBlackListed(value: number): void {
    this.maxBlackListed = value;
  }

  static setMaxTimeLimit(value: number): void {
    this.maxTimeLimit = value;
  }

  /**
   * Run match using child process
   *
   * @param {*} values array of regular expression to be evaluated
   * @param {*} input to be matched
   * @returns match result
   */
  private static async safeMatch(values: string[], input: string): Promise<boolean> {
    let result = false;
    let timer: number, resolveListener: (value: unknown) => void;

    if (this.isBlackListed(values, input)) {
      return false;
    }

    const matchPromise = new Promise((resolve) => {
      resolveListener = resolve;
      this.worker.onmessage = (e) => resolveListener(e.data);
      this.worker.postMessage({ values, input });
    });

    const matchTimer = new Promise((resolve) => {
      timer = setTimeout(() => {
        this.resetWorker(values, input);
        resolve(false);
      }, this.maxTimeLimit);
    });

    await Promise.race([matchPromise, matchTimer]).then((value) => {
      this.worker.removeEventListener('message', resolveListener);
      clearTimeout(timer);
      result = Boolean(value);
    });

    return result;
  }

  private static isBlackListed(values: string[], input: string): boolean {
    const bls = this.blacklisted.filter((bl) =>
      // input can contain same segment that could fail matching operation
      (bl.input.includes(input) || input.includes(bl.input)) &&
      // regex order should not affect
      bl.res.filter((value) => values.includes(value)).length
    );
    return bls.length > 0;
  }

  /**
   * Called when match worker fails to finish in time by;
   * - Killing worker
   * - Restarting new worker
   * - Caching entry to the blacklist
   *
   * @param {*} values list of regex and input
   * @param {*} input to be matched
   */
  private static resetWorker(values: string[], input: string) {
    this.worker.terminate();
    this.worker = this.createChildProcess();

    if (this.blacklisted.length == this.maxBlackListed) {
      this.blacklisted.splice(0, 1);
    }

    this.blacklisted.push({
      res: values,
      input,
    });
  }

  private static createChildProcess(): Worker {
    const workerUrl = new URL('./worker.ts', import.meta.url).href;
    return new Worker(workerUrl, {
      type: 'module',
    });
  }
}

type Blacklist = {
  res: string[];
  input: string;
};
