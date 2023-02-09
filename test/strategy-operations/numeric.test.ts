import { assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.177.0/testing/bdd.ts';
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

  it('should agree when input EXIST in values - String type', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.EXIST, '3', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when input exist but test as DOES NOT EXIST ', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '1', mock_values2);
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST in values', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '2', mock_values2);
    assertTrue(result);
  });

  it('should agree when input is EQUAL to value', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, '1', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is not equal but test as EQUAL', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, '2', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is NOT EQUAL to value', async function () {
    const result = await processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, '2', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is GREATER than value', async function () {
    let result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '2', mock_values1);
    assertTrue(result);

    // test decimal
    result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '1.01', mock_values1);
    assertTrue(result);

    result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '1.55', mock_values3);
    assertTrue(result);
  });

  it('should NOT agree when input is lower but tested as GREATER than value', async function () {
    let result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '0', mock_values1);
    assertFalse(result);

    // test decimal
    result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '0.99', mock_values1);
    assertFalse(result);

    result = await processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, '1.49', mock_values3);
    assertFalse(result);
  });

  it('should agree when input is LOWER than value', async function () {
    let result = await processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, '0', mock_values1);
    assertTrue(result);

    // test decimal
    result = await processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, '0.99', mock_values1);
    assertTrue(result);

    result = await processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, '1.49', mock_values3);
    assertTrue(result);
  });

  it('should agree when input is BETWEEN values', async function () {
    let result = await processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, '1', mock_values2);
    assertTrue(result);

    // test decimal
    result = await processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, '2.99', mock_values2);
    assertTrue(result);

    result = await processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, '1.001', mock_values2);
    assertTrue(result);
  });

});
