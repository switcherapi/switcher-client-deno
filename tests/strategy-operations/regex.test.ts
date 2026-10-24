import { assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import TimedMatch from '../../src/lib/utils/timed-match/index.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

const { test } = Deno;
const { beforeAll, afterAll } = test;

const mock_values1 = [
  String.raw`\bUSER_[0-9]{1,2}\b`,
];

const mock_values2 = [
  String.raw`\bUSER_[0-9]{1,2}\b`,
  String.raw`\buser-[0-9]{1,2}\b`,
];

const mock_values3 = [
  'USER_[0-9]{1,2}',
];

const givenStrategyConfig = (operation: string, values: string[]) => ({
  strategy: StrategiesType.REGEX,
  operation: operation,
  values: values,
  activated: true,
});

beforeAll(() => TimedMatch.initializeWorker());
afterAll(() => TimedMatch.terminateWorker());

test('should agree when expect to exist using EXIST operation', function () {
  let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
  let result = processOperation(strategyConfig, 'USER_1');
  assertTrue(result);

  strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
  result = processOperation(strategyConfig, 'user-01');
  assertTrue(result);
});

test('should NOT agree when expect to exist using EXIST operation', function () {
  let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
  let result = processOperation(strategyConfig, 'USER_123');
  assertFalse(result);

  //mock_values3 does not require exact match
  strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values3);
  result = processOperation(strategyConfig, 'USER_123');
  assertTrue(result);
});

test('should agree when expect to not exist using NOT_EXIST operation', function () {
  let strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
  let result = processOperation(strategyConfig, 'USER_123');
  assertTrue(result);

  strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
  result = processOperation(strategyConfig, 'user-123');
  assertTrue(result);
});

test('should NOT agree when expect to not exist using NOT_EXIST operation', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
  const result = processOperation(strategyConfig, 'USER_12');
  assertFalse(result);
});

test('should agree when expect to be equal using EQUAL operation', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
  const result = processOperation(strategyConfig, 'USER_11');
  assertTrue(result);
});

test('should NOT agree when expect to be equal using EQUAL operation', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
  const result = processOperation(strategyConfig, 'user-11');
  assertFalse(result);
});

test('should agree when expect to not be equal using NOT_EQUAL operation', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
  const result = processOperation(strategyConfig, 'USER_123');
  assertTrue(result);
});

test('should NOT agree when expect to not be equal using NOT_EQUAL operation', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
  const result = processOperation(strategyConfig, 'USER_1');
  assertFalse(result);
});

test('should NOT agree when match cannot finish (reDoS attempt)', function () {
  const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, ['^(([a-z])+.)+[A-Z]([a-z])+$']);
  const result = processOperation(strategyConfig, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assertFalse(result);
});

test('should agree when expect to exist using EXIST operation', function () {
  // given
  TimedMatch.terminateWorker();

  const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
  const result = processOperation(strategyConfig, 'USER_1');
  assertTrue(result);
});