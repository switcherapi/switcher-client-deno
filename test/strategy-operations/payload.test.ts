import { assertFalse, assertArrayIncludes } from 'https://deno.land/std@0.176.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.176.0/testing/bdd.ts';
import { assertTrue } from '../helper/utils.ts';
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from '../../src/lib/snapshot.ts';
import { payloadReader } from '../../src/lib/utils/payloadReader.ts';

describe('Strategy [PAYLOAD] tests:', function () {
  const fixture_1 = JSON.stringify({
      id: '1',
      login: 'petruki'
    }
  );

  const fixture_values2 = JSON.stringify({
    product: 'product-1',
    order: {
        qty: 1,
        deliver: {
            expect: '2019-12-10',
            tracking: [
                {
                    date: '2019-12-09',
                    status: 'sent'
                },
                {
                    date: '2019-12-10',
                    status: 'delivered',
                    comments: 'comments'
                }
            ]
        }
      }
    }
  );

  const fixture_values3 = JSON.stringify({
      description: 'Allowed IP address',
      strategy: 'NETWORK_VALIDATION',
      values: ['10.0.0.3/24'],
      operation: 'EXIST',
      env: 'default'
    }
  );

  it('should read keys from payload #1', function () {
    const keys = payloadReader(JSON.parse(fixture_values2));
    assertArrayIncludes(keys, [                
        'product',
        'order',
        'order.qty',
        'order.deliver',
        'order.deliver.expect',        
        'order.deliver.tracking',      
        'order.deliver.tracking.date', 
        'order.deliver.tracking.status',
        'order.deliver.tracking.comments'
    ]);
  });

  it('should read keys from payload #2', function () {
    const keys = payloadReader(JSON.parse(fixture_values3));
    assertArrayIncludes(keys, [                
        'description',
        'strategy',
        'values',
        'operation',
        'env'
    ]);
  });

  it('should read keys from payload with array values', function () {
    const keys = payloadReader({
      order: {
          items: ['item_1', 'item_2']
      }
    });
    assertArrayIncludes(keys, [                
        'order',
        'order.items'
    ]);
  });

  it('should return TRUE when payload has field', async function () {
    assertTrue(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ['login']));
  });

  it('should return FALSE when payload does not have field', async function () {
    assertFalse(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ['user']));
  });

  it('should return TRUE when payload has nested field', async function () {
    assertTrue(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        'order.qty', 'order.total'
    ]));
  });

  it('should return TRUE when payload has nested field with arrays', async function () {
    assertTrue(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        'order.deliver.tracking.status'
    ]));
  });

  it('should return TRUE when payload has all', async function () {
    assertTrue(await processOperation( StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        'product',
        'order',
        'order.qty',
        'order.deliver',
        'order.deliver.expect',        
        'order.deliver.tracking',      
        'order.deliver.tracking.date', 
        'order.deliver.tracking.status'
    ]));
  });

  it('should return FALSE when payload does not have all', async function () {
    assertFalse(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        'product',
        'order',
        'order.NOT_EXIST_KEY',
    ]));
  });

  it('should return FALSE when payload is not a JSON string', async function () {
    assertFalse(await processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, 'NOT_JSON', []));
  });

});