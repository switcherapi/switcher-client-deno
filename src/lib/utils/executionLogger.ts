import { SwitcherResult } from '../result.ts';

const logger: ExecutionLogger[] = [];

/**
 * It keeps track of latest execution results.
 */
export default class ExecutionLogger {
  private static _callbackError: (err: Error) => void;

  key?: string;
  input?: string[][];
  response: SwitcherResult = SwitcherResult.create();

  /**
   * Add new execution result
   */
  static add(
    response: SwitcherResult,
    key: string,
    input?: string[][],
  ): void {
    for (let index = 0; index < logger.length; index++) {
      const log = logger[index];
      if (this.hasExecution(log, key, input)) {
        logger.splice(index, 1);
        break;
      }
    }

    logger.push({ key, input, response });
  }

  /**
   * Retrieve a specific result given a key and an input
   */
  static getExecution(
    key: string,
    input?: string[][],
  ): ExecutionLogger {
    const result = logger.filter((value) => this.hasExecution(value, key, input));
    return result[0];
  }

  /**
   * Retrieve results given a switcher key
   */
  static getByKey(key: string): ExecutionLogger[] {
    return logger.filter((value) => value.key === key);
  }

  /**
   * Clear all results
   */
  static clearLogger(): void {
    logger.splice(0, logger.length);
  }

  /**
   * Subscribe to error notifications
   */
  static subscribeNotifyError(callbackError: (err: Error) => void) {
    ExecutionLogger._callbackError = callbackError;
  }

  /**
   * Push error notification
   */
  static notifyError(error: Error) {
    if (ExecutionLogger._callbackError) {
      ExecutionLogger._callbackError(error);
    }
  }

  private static hasExecution(log: ExecutionLogger, key: string, input: string[][] | undefined) {
    return log.key === key && JSON.stringify(log.input) === JSON.stringify(input);
  }
}
