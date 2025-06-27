import { describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [VALUE] tests:', function () {
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

  it('should agree when input EXIST', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_1');
    assertTrue(result);
  });

  it('should NOT agree when input DOES NOT EXIST', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_123');
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_123');
    assertTrue(result);
  });

  it('should agree when input is EQUAL', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_1');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT EQUAL', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
    const result = await processOperation(strategyConfig, 'USER_2');
    assertFalse(result);
  });

  it('should agree when input is NOT EQUAL', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
    const result = await processOperation(strategyConfig, 'USER_123');
    assertTrue(result);
  });

  it('should NOT agree when input is NOT EQUAL', async function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
    const result = await processOperation(strategyConfig, 'USER_2');
    assertFalse(result);
  });

});
