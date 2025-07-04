import { DEFAULT_REGEX_MAX_BLACKLISTED, DEFAULT_REGEX_MAX_TIME_LIMIT } from '../../constants.ts';
import tryMatch from './match.ts';

/**
 * This class will run a match operation using a Worker Thread.
 *
 * Workers should be killed given a specified (3000 ms default) time limit.
 *
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
    this.worker = this.createWorker();
    this.workerActive = true;
  }

  /**
   * Gracefully terminate worker
   */
  static terminateWorker() {
    this.worker?.terminate();
    this.workerActive = false;
  }

  /**
   * Executes regex matching operation with timeout protection.
   *
   * If a worker is initialized and active, the operation runs in a separate worker thread
   * with timeout protection to prevent runaway regex operations. Uses SharedArrayBuffer
   * for synchronous communication between main thread and worker.
   *
   * If no worker is available, falls back to direct execution on the main thread.
   *
   * Failed operations (timeouts, errors) are automatically added to a blacklist to
   * prevent repeated attempts with the same problematic patterns.
   *
   * @param values Array of regular expression patterns to test against the input
   * @param input The input string to match against the regex patterns
   * @returns True if any of the regex patterns match the input, false otherwise
   */
  static tryMatch(values: string[], input: string): boolean {
    if (this.worker && this.workerActive) {
      return this.safeMatch(values, input);
    }

    return tryMatch(values, input);
  }

  /**
   * Run match using SharedArrayBuffer for true synchronous communication
   *
   * @param {*} values array of regular expression to be evaluated
   * @param {*} input to be matched
   * @returns match result
   */
  private static safeMatch(values: string[], input: string): boolean {
    if (this.isBlackListed(values, input)) {
      return false;
    }

    // Create shared buffer for worker communication
    const sharedBuffer = new SharedArrayBuffer(8);
    const sharedArray = new Int32Array(sharedBuffer);

    // Initialize: [0] = status (0=waiting, 1=done), [1] = result (0=false, 1=true)
    sharedArray[0] = 0; // status
    sharedArray[1] = 0; // result

    this.worker.postMessage({ values, input, sharedBuffer });

    // Wait for worker to complete or timeout
    const result = Atomics.wait(sharedArray, 0, 0, this.maxTimeLimit);

    if (result === 'timed-out') {
      this.resetWorker(values, input);
      return false;
    }

    return sharedArray[1] === 1;
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
    this.worker = this.createWorker();

    if (this.blacklisted.length == this.maxBlackListed) {
      this.blacklisted.splice(0, 1);
    }

    this.blacklisted.push({
      res: values,
      input,
    });
  }

  private static createWorker(): Worker {
    const workerUrl = new URL('./worker.ts', import.meta.url).href;
    return new Worker(workerUrl, {
      type: 'module',
    });
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
}

type Blacklist = {
  res: string[];
  input: string;
};
