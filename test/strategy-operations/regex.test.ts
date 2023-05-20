import { assertFalse } from 'https://deno.land/std@0.188.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.188.0/testing/bdd.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';

describe('Strategy [REGEX] tests:', function () {
  const mock_values1 = [
    '\\bUSER_[0-9]{1,2}\\b',
  ];

  const mock_values2 = [
    '\\bUSER_[0-9]{1,2}\\b',
    '\\buser-[0-9]{1,2}\\b',
  ];

  const mock_values3 = [
    'USER_[0-9]{1,2}',
  ];

  it('should agree when expect to exist using EXIST operation', async function () {
    let result = await processOperation(StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', mock_values1);
    assertTrue(result);

    result = await processOperation(StrategiesType.REGEX, OperationsType.EXIST, 'user-01', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when expect to exist using EXIST operation', async function () {
    let result = await processOperation(StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values1);
    assertFalse(result);

    //mock_values3 does not require exact match
    result = await processOperation(StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values3);
    assertTrue(result);
  });

  it('should agree when expect to not exist using NOT_EXIST operation', async function () {
    let result = await processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
    assertTrue(result);

    result = await processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, 'user-123', mock_values2);
    assertTrue(result);
  });

  it('should NOT agree when expect to not exist using NOT_EXIST operation', async function () {
    const result = await processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_12', mock_values1);
    assertFalse(result);
  });

  it('should agree when expect to be equal using EQUAL operation', async function () {
    const result = await processOperation(StrategiesType.REGEX, OperationsType.EQUAL, 'USER_11', mock_values3);
    assertTrue(result);
  });

  it('should NOT agree when expect to be equal using EQUAL operation', async function () {
    const result = await processOperation(StrategiesType.REGEX, OperationsType.EQUAL, 'user-11', mock_values3);
    assertFalse(result);
  });

  it('should agree when expect to not be equal using NOT_EQUAL operation', async function () {
    const result = await processOperation(StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_123', mock_values3);
    assertTrue(result);
  });

  it('should NOT agree when expect to not be equal using NOT_EQUAL operation', async function () {
    const result = await processOperation(StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_1', mock_values3);
    assertFalse(result);
  });

  it('should NOT agree when match cannot finish (reDoS attempt)', async function () {
    const result = await processOperation(
        StrategiesType.REGEX, OperationsType.EQUAL, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ['^(([a-z])+.)+[A-Z]([a-z])+$']);
        assertFalse(result);
  });
});