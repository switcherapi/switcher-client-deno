import { assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.177.0/testing/bdd.ts';
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

  it('should agree when input is LOWER', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is LOWER or SAME', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is GREATER', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is GREATER or SAME', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT GREATER', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is in BETWEEN', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT in BETWEEN', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', mock_values2);
    assertFalse(result);
  });

  it('should agree when input is LOWER including time', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values3);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT LOWER including time', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is GREATER including time', async function () {
    const result = await processOperation(StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', mock_values3);
    assertTrue(result);
  });

});
