import { Criteria } from '../../types/index.d.ts';

const logger: ExecutionLogger[] = [];

export default class ExecutionLogger {
  key?: string;
  input?: string[][];
  response: Criteria = { result: false };

  /**
   * Add new execution result
   *
   * @param key
   * @param input
   * @param response
   */
  static add(
    response: Criteria,
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
   *
   * @param key Switcher key
   * @param input Switcher input
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
   *
   * @param key
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

  private static hasExecution(log: ExecutionLogger, key: string, input: string[][] | undefined) {
    return log.key === key && JSON.stringify(log.input) === JSON.stringify(input);
  }
}
