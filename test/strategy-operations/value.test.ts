import { assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.177.0/testing/bdd.ts';
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

  it('should agree when input EXIST', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.EXIST, 'USER_1', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.EXIST, 'USER_123', mock_values1);
    assertFalse(result);
  });

  it('should agree when input DOES NOT EXIST', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
    assertTrue(result);
  });

  it('should agree when input is EQUAL', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.EQUAL, 'USER_1', mock_values1);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT EQUAL', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.EQUAL, 'USER_2', mock_values1);
    assertFalse(result);
  });

  it('should agree when input is NOT EQUAL', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_123', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when input is NOT EQUAL', async function () {
    const result = await processOperation(StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_2', mock_values2);
    assertFalse(result);
  });

});
