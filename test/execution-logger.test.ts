import { beforeEach, describe, it, assertEquals } from './deps.ts';

import ExecutionLogger from '../src/lib/utils/executionlogger.ts';
import { checkValue } from '../src/lib/middlewares/check.ts';

describe('ExecutionLogger tests:', function () {
    beforeEach(function () {
        ExecutionLogger.clearLogger();
    });

    it('should add a new execution and return result', function () {
        //given
        const key = 'SWITCHER_KEY';
        const input = [checkValue('test')];
        const response = { result: true };

        //test
        ExecutionLogger.add(response, key, input);
        const result = ExecutionLogger.getExecution(key, input);
        assertEquals(result.response, response);
    });

    it('should replace an existing execution and return result', function () {
        //given
        const key = 'SWITCHER_KEY';
        const input = [checkValue('test')];

        //test
        ExecutionLogger.add({ result: true }, key, input);
        ExecutionLogger.add({ result: false }, key, input);
        const result = ExecutionLogger.getExecution(key, input);
        assertEquals(result.response, { result: false });
    });

    it('should NOT return a result given a key', function () {
        //given
        const key = 'SWITCHER_KEY';
        const input = [checkValue('test')];

        //test
        ExecutionLogger.add({ result: true }, key, input);
        const result = ExecutionLogger.getExecution('DIFFERENT_KEY', input);
        assertEquals(result, undefined);
    });

    it('should NOT return a result given a different input', function () {
        //given
        const key = 'SWITCHER_KEY';
        const input = [checkValue('test')];

        //test
        ExecutionLogger.add({ result: true }, key, input);
        const result = ExecutionLogger.getExecution(key, [checkValue('different')]);
        assertEquals(result, undefined);
    });

    it('should return all results given a key', function () {
        //given
        const key = 'SWITCHER_KEY';

        //test
        ExecutionLogger.add({ result: true }, key, [checkValue('test_true')]);
        ExecutionLogger.add({ result: false }, key, [checkValue('test_false')]);
        const result = ExecutionLogger.getByKey(key);
        assertEquals(result.length, 2);
    });
    
});