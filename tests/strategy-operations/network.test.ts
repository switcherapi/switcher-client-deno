import { describe, it, assertFalse } from '../deps.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [NETWORK] tests:', function () {
  const mock_values1 = [
    '10.0.0.0/30',
  ];

  const mock_values2 = [
    '10.0.0.0/30',
    '192.168.0.0/30',
  ];

  const mock_values3 = [
    '192.168.56.56',
    '192.168.56.57',
    '192.168.56.58',
  ];

  const givenStrategyConfig = (operation: string, values: string[]) => ({
    strategy: StrategiesType.NETWORK,
    operation: operation,
    values: values,
    activated: true,
  });

  it('should agree when input range EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    const result = processOperation(strategyConfig, '10.0.0.3');
    assertTrue(result);
  });

  it('should agree when input range EXIST - Irregular CIDR', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST,  ['10.0.0.3/24']);
    const result = processOperation(strategyConfig, '10.0.0.3');
    assertTrue(result);
  });

  it('should NOT agree when input range DOES NOT EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
    const result = processOperation(strategyConfig, '10.0.0.4');
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
    const result = processOperation(strategyConfig, '10.0.0.4');
    assertTrue(result);
  });

  it('should NOT agree when input EXIST but assumed that it DOES NOT EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
    const result = processOperation(strategyConfig, '10.0.0.3');
    assertFalse(result);
  });

  it('should agree when input IP EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values3);
    const result = processOperation(strategyConfig, '192.168.56.58');
    assertTrue(result);
  });

  it('should agree when input IP DOES NOT EXIST', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values3);
    const result = processOperation(strategyConfig, '192.168.56.50');
    assertTrue(result);
  });

  it('should agree when input range EXIST for multiple ranges', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
    const result = processOperation(strategyConfig, '192.168.0.3');
    assertTrue(result);
  });

  it('should NOT agree when input range DOES NOT EXIST for multiple ranges', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
    const result = processOperation(strategyConfig, '127.0.0.0');
    assertTrue(result);
  });

});