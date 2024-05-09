import { beforeEach, describe, it, assertEquals } from '../deps.ts';

import { Switcher } from '../../mod.ts';
import ExecutionLogger from "../../src/lib/utils/executionLogger.ts";

describe('ExecutionLogger tests:', function () {
    beforeEach(function () {
        ExecutionLogger.clearLogger();
    });

    it('should add a new execution and return result', function () {
        //given
        const switcher = Switcher.factory('SWITCHER_KEY').checkValue('test');
        const response = { result: true };

        //test
        ExecutionLogger.add(response, switcher.key, switcher.input);
        const result = ExecutionLogger.getExecution(switcher.key, switcher.input);
        assertEquals(result.response, response);
    });

    it('should replace an existing execution and return result', function () {
        //given
        const switcher = Switcher.factory('SWITCHER_KEY').checkValue('test');

        //test
        ExecutionLogger.add({ result: true }, switcher.key, switcher.input);
        ExecutionLogger.add({ result: false }, switcher.key, switcher.input);
        const result = ExecutionLogger.getExecution(switcher.key, switcher.input);
        assertEquals(result.response, { result: false });
    });

    it('should NOT return a result given a key', function () {
        //given
        const switcher = Switcher.factory('SWITCHER_KEY').checkValue('test');

        //test
        ExecutionLogger.add({ result: true }, switcher.key, switcher.input);
        const result = ExecutionLogger.getExecution('DIFFERENT_KEY', switcher.input);
        assertEquals(result, undefined);
    });

    it('should NOT return a result given a different input', function () {
        //given
        const switcher1 = Switcher.factory('SWITCHER_KEY').checkValue('test');
        const switcher2 = Switcher.factory('SWITCHER_KEY').checkValue('different');

        //test
        ExecutionLogger.add({ result: true }, switcher1.key, switcher1.input);
        const result = ExecutionLogger.getExecution(switcher1.key, switcher2.input);
        assertEquals(result, undefined);
    });

    it('should return all results given a key', function () {
        //given
        const key = 'SWITCHER_KEY';
        const switcher1 = Switcher.factory(key).checkValue('test_true');
        const switcher2 = Switcher.factory(key).checkValue('test_false');

        //test
        ExecutionLogger.add({ result: true }, switcher1.key, switcher1.input);
        ExecutionLogger.add({ result: false }, switcher2.key, switcher2.input);
        const result = ExecutionLogger.getByKey(key);
        assertEquals(result.length, 2);
    });
    
});