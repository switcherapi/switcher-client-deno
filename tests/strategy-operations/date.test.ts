import { assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

const { test } = Deno;

const mock_values1 = [
  '2019-12-01',
];

const mock_values2 = [
  '2019-12-01',
  '2019-12-05',
];

const mock_values3 = [
  '2019-12-01T08:30',
];

const givenStrategyConfig = (operation: string, values: string[]) => ({
  strategy: StrategiesType.DATE,
  operation: operation,
  values: values,
  activated: true,
});

test('should agree when input is LOWER', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
  const result = processOperation(strategyConfig, '2019-11-26');
  assertTrue(result);
});

test('should agree when input is LOWER or SAME', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
  const result = processOperation(strategyConfig, '2019-12-01');
  assertTrue(result);
});

test('should NOT agree when input is NOT LOWER', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
  const result = processOperation(strategyConfig, '2019-12-02');
  assertFalse(result);
});

test('should agree when input is GREATER', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
  const result = processOperation(strategyConfig, '2019-12-02');
  assertTrue(result);
});

test('should agree when input is GREATER or SAME', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
  const result = processOperation(strategyConfig, '2019-12-01');
  assertTrue(result);
});

test('should NOT agree when input is NOT GREATER', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
  const result = processOperation(strategyConfig, '2019-11-10');
  assertFalse(result);
});

test('should agree when input is in BETWEEN', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
  const result = processOperation(strategyConfig, '2019-12-03');
  assertTrue(result);
});

test('should NOT agree when input is NOT in BETWEEN', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
  const result = processOperation(strategyConfig, '2019-12-12');
  assertFalse(result);
});

test('should agree when input is LOWER including time', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
  const result = processOperation(strategyConfig, '2019-12-01T07:00');
  assertTrue(result);
});

test('should NOT agree when input is NOT LOWER including time', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
  const result = processOperation(strategyConfig, '2019-12-01T07:00');
  assertFalse(result);
});

test('should agree when input is GREATER including time', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
  const result = processOperation(strategyConfig, '2019-12-01T08:40');
  assertTrue(result);
});