import { beforeAll, afterAll, describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import TimedMatch from '../../src/lib/utils/timed-match/index.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

const mock_values1 = [
  '\\bUSER_[0-9]{1,2}\\b',
];

const mock_values2 = [
  '\\bUSER_[0-9]{1,2}\\b',
  '\\buser-[0-9]{1,2}\\b',
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

describe('Strategy [REGEX Safe] tests:', function () {
  beforeAll(() => TimedMatch.initializeWorker());
  afterAll(() => TimedMatch.terminateWorker());

  it('should agree when expect to exist using EXIST operation', async function () {
    let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    let result = await processOperation(strategyConfig, 'USER_1');
    assertTrue(result);

    strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
    result = await processOperation(strategyConfig, 'user-01');
    assertTrue(result);
  });

  it('should NOT agree when expect to exist using EXIST operation', async function () {
    let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    let result = await processOperation(strategyConfig, 'USER_123');
    assertFalse(result);

    //mock_values3 does not require exact match
    strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values3);
    result = await processOperation(strategyConfig, 'USER_123');
    assertTrue(result);
  });

  it('should agree when expect to not exist using NOT_EXIST operation', async function () {
    let strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
    let result = await processOperation(strategyConfig, 'USER_123');
    assertTrue(result);

    strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
    result = await processOperation(strategyConfig, 'user-123');
    assertTrue(result);
  });

  it('should NOT agree when expect to not exist using NOT_EXIST operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_12');
    assertFalse(result);
  });

  it('should agree when expect to be equal using EQUAL operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
    const result = await processOperation(strategyConfig, 'USER_11');
    assertTrue(result);
  });

  it('should NOT agree when expect to be equal using EQUAL operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
    const result = await processOperation(strategyConfig, 'user-11');
    assertFalse(result);
  });

  it('should agree when expect to not be equal using NOT_EQUAL operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
    const result = await processOperation(strategyConfig, 'USER_123');
    assertTrue(result);
  });

  it('should NOT agree when expect to not be equal using NOT_EQUAL operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
    const result = await processOperation(strategyConfig, 'USER_1');
    assertFalse(result);
  });

  it('should NOT agree when match cannot finish (reDoS attempt)', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, ['^(([a-z])+.)+[A-Z]([a-z])+$']);
    const result = await processOperation(strategyConfig, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assertFalse(result);
  });
});

describe('Strategy [REGEX] tests:', function () {
  beforeAll(() => TimedMatch.terminateWorker());

  it('should agree when expect to exist using EXIST operation', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_1');
    assertTrue(result);
  });
});