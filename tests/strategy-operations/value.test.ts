import { assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

const { test } = Deno;

const mock_values1 = [
  'USER_1',
];

const mock_values2 = [
  'USER_1',
  'USER_2',
];

const givenStrategyConfig = (operation: string, values: string[]) => ({
  strategy: StrategiesType.VALUE,
  operation: operation,
  values: values,
  activated: true,
});

test('should agree when input EXIST', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
  const result = processOperation(strategyConfig, 'USER_1');
  assertTrue(result);
});

test('should NOT agree when input DOES NOT EXIST', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
  const result = processOperation(strategyConfig, 'USER_123');
  assertFalse(result);
});

test('should agree when input DOES NOT EXIST', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
  const result = processOperation(strategyConfig, 'USER_123');
  assertTrue(result);
});

test('should agree when input is EQUAL', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
  const result = processOperation(strategyConfig, 'USER_1');
  assertTrue(result);
});

test('should NOT agree when input is NOT EQUAL', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
  const result = processOperation(strategyConfig, 'USER_2');
  assertFalse(result);
});

test('should agree when input is NOT EQUAL', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
  const result = processOperation(strategyConfig, 'USER_123');
  assertTrue(result);
});

test('should NOT agree when input is NOT EQUAL', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
  const result = processOperation(strategyConfig, 'USER_2');
  assertFalse(result);
});