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

    logger.push({
      key,
      input,
      response: SwitcherResult.create(response.result, response.reason, {
        ...response.metadata,
        cached: true,
      }),
    });
  }

  /**
   * Retrieve a specific result given a key and an input
   */
  static getExecution(
    key: string,
    input?: string[][],
  ): ExecutionLogger {
    for (const log of logger) {
      if (this.hasExecution(log, key, input)) {
        return log;
      }
    }

    return new ExecutionLogger();
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
   * Clear results by switcher key
   */
  static clearByKey(key: string): void {
    for (let index = logger.length - 1; index >= 0; index--) {
      if (logger[index].key === key) {
        logger.splice(index, 1);
      }
    }
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
    return log.key === key && this.checkStrategyInputs(log.input, input);
  }

  private static checkStrategyInputs(loggerInputs: string[][] | undefined, inputs: string[][] | undefined): boolean {
    for (const [strategy, input] of loggerInputs || []) {
      const found = inputs?.find((i) => i[0] === strategy && i[1] === input);
      if (!found) {
        return false;
      }
    }

    return true;
  }
}
