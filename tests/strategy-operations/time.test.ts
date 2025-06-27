import { describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [TIME] tests:', function () {
  const mock_values1 = [
    '08:00',
  ];

  const mock_values2 = [
    '08:00',
    '10:00',
  ];

  const givenStrategyConfig = (operation: string, values: string[]) => ({
    strategy: StrategiesType.TIME,
    operation: operation,
    values: values,
    activated: true,
  });

  it('should agree when input is LOWER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '06:00');
    assertTrue(result);
  });

  it('should agree when input is LOWER or SAME', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '08:00');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    const result = await processOperation(strategyConfig, '10:00');
    assertFalse(result);
  });

  it('should agree when input is GREATER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '10:00');
    assertTrue(result);
  });

  it('should agree when input is GREATER or SAME', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '08:00');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT GREATER', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    const result = await processOperation(strategyConfig, '06:00');
    assertFalse(result);
  });

  it('should agree when input is in BETWEEN', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
    const result = await processOperation(strategyConfig, '09:00');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT in BETWEEN', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
    const result = await processOperation(strategyConfig, '07:00');
    assertFalse(result);
  });

});
