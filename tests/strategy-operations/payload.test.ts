import { describe, it, assertFalse, assertArrayIncludes } from '../deps.ts';
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

  const givenStrategyConfig = (operation: string, values: string[]) => ({
    strategy: StrategiesType.PAYLOAD,
    operation: operation,
    values: values,
    activated: true,
  });

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

  it('should return TRUE when payload has field', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, ['login']);
    assertTrue(processOperation(strategyConfig, fixture_1));
  });

  it('should return FALSE when payload does not have field', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, ['user']);
    assertFalse(processOperation(strategyConfig, fixture_1));
  });

  it('should return TRUE when payload has nested field', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, [
        'order.qty', 'order.total'
    ]);

    assertTrue(processOperation(strategyConfig, fixture_values2));
  });

  it('should return TRUE when payload has nested field with arrays', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, [
        'order.deliver.tracking.status'
    ]);

    assertTrue(processOperation(strategyConfig, fixture_values2));
  });

  it('should return TRUE when payload has all', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, [
        'product',
        'order',
        'order.qty',
        'order.deliver',
        'order.deliver.expect',        
        'order.deliver.tracking',      
        'order.deliver.tracking.date', 
        'order.deliver.tracking.status'
    ]);

    assertTrue(processOperation(strategyConfig, fixture_values2));
  });

  it('should return FALSE when payload does not have all', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, [
        'product',
        'order',
        'order.NOT_EXIST_KEY',
    ]);

    assertFalse(processOperation(strategyConfig, fixture_values2));
  });

  it('should return FALSE when payload is not a JSON string', function () {
    const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, []);
    assertFalse(processOperation(strategyConfig, 'NOT_JSON'));
  });

});