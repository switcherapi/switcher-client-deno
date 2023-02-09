import { assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.177.0/testing/bdd.ts';
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

  it('should agree when input range EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', mock_values1);
    assertTrue(result);
  });

  it('should agree when input range EXIST - Irregular CIDR', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', ['10.0.0.3/24']);
    assertTrue(result);
  });

  it('should NOT agree when input range DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.4', mock_values1);
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.4', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input EXIST but assumed that it DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.3', mock_values1);
    assertFalse(result);
  });

  it('should agree when input IP EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.EXIST, '192.168.56.58', mock_values3);
    assertTrue(result);
  });

  it('should agree when input IP DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, '192.168.56.50', mock_values3);
    assertTrue(result);
  });

  it('should agree when input range EXIST for multiple ranges', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.EXIST, '192.168.0.3', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when input range DOES NOT EXIST for multiple ranges', async function () {
    const result = await processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, '127.0.0.0', mock_values2);
    assertTrue(result);
  });

});