import { describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [NUMERIC] tests:', function () {
  const mock_values1 = [
    '1',
  ];

  const mock_values2 = [
    '1',
    '3',
  ];

  const mock_values3 = [
    '1.5',
  ];

  const givenStrategyConfig = (operation: string, values: string[]) => ({
    strategy: StrategiesType.NUMERIC,
    operation: operation,
    values: values,
    activated: true,
  });

  it('should agree when input EXIST in values - String type', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
    const result = processOperation(strategyConfig, '3');
    assertTrue(result);
  });

  it('should NOT agree when input exist but test as DOES NOT EXIST ', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
    const result = processOperation(strategyConfig, '1');
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST in values', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
    const result = processOperation(strategyConfig, '2');
    assertTrue(result);
  });

  it('should agree when input is EQUAL to value', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
    const result = processOperation(strategyConfig, '1');
    assertTrue(result);
  });

  it('should NOT agree when input is not equal but test as EQUAL', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
    const result = processOperation(strategyConfig, '2');
    assertFalse(result);
  });

  it('should agree when input is NOT EQUAL to value', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values1);
    const result = processOperation(strategyConfig, '2');
    assertTrue(result);
  });

  it('should agree when input is GREATER than value', function () {
    let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    let result = processOperation(strategyConfig, '2');
    assertTrue(result);

    // test decimal
    result = processOperation(strategyConfig, '1.01');
    assertTrue(result);

    strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
    result = processOperation(strategyConfig, '1.55');
    assertTrue(result);
  });

  it('should NOT agree when input is lower but tested as GREATER than value', function () {
    let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
    let result = processOperation(strategyConfig, '0');
    assertFalse(result);

    // test decimal
    result = processOperation(strategyConfig, '0.99');
    assertFalse(result);

    strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
    result = processOperation(strategyConfig, '1.49');
    assertFalse(result);
  });

  it('should agree when input is LOWER than value', function () {
    let strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
    let result = processOperation(strategyConfig, '0');
    assertTrue(result);

    // test decimal
    result = processOperation(strategyConfig, '0.99');
    assertTrue(result);

    strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
    result = processOperation(strategyConfig, '1.49');
    assertTrue(result);
  });

  it('should agree when input is BETWEEN values', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
    let result = processOperation(strategyConfig, '1');
    assertTrue(result);

    // test decimal
    result = processOperation(strategyConfig, '2.99');
    assertTrue(result);

    result = processOperation(strategyConfig, '1.001');
    assertTrue(result);
  });

});
