import { assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.177.0/testing/bdd.ts';
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

  it('should agree when input is LOWER', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.LOWER, '06:00', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is LOWER or SAME', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.LOWER, '08:00', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.LOWER, '10:00', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is GREATER', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.GREATER, '10:00', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is GREATER or SAME', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.GREATER, '08:00', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT GREATER', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.GREATER, '06:00', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is in BETWEEN', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.BETWEEN, '09:00', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT in BETWEEN', async function () {
    const result = await processOperation(StrategiesType.TIME, OperationsType.BETWEEN, '07:00', mock_values2);
    assertFalse(result);
  });

});
