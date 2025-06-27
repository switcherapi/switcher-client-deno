import { describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [DATE] tests:', function () {
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

  it('should agree when input is LOWER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-11-26');
    assertTrue(result);
  });

  it('should agree when input is LOWER or SAME', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-12-01');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-12-02');
    assertFalse(result);
  });

  it('should agree when input is GREATER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-12-02');
    assertTrue(result);
  });

  it('should agree when input is GREATER or SAME', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-12-01');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT GREATER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-11-10');
    assertFalse(result);
  });

  it('should agree when input is in BETWEEN', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
    const result = await processOperation(strategyConfig, '2019-12-03');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT in BETWEEN', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
    const result = await processOperation(strategyConfig, '2019-12-12');
    assertFalse(result);
  });

  it('should agree when input is LOWER including time', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
    const result = await processOperation(strategyConfig, '2019-12-01T07:00');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER including time', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '2019-12-01T07:00');
    assertFalse(result);
  });

  it('should agree when input is GREATER including time', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
    const result = await processOperation(strategyConfig, '2019-12-01T08:40');
    assertTrue(result);
  });

});
