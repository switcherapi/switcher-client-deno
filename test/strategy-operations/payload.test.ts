import { assertEquals, assertArrayIncludes } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";
import { payloadReader } from "../../src/lib/utils/payloadReader.ts";

const { test } = Deno;

const fixture_1 = JSON.stringify({
    id: "1",
    login: "petruki"
  }
);

const fixture_values2 = JSON.stringify({
  product: "product-1",
  order: {
      qty: 1,
      deliver: {
          expect: "2019-12-10",
          tracking: [
              {
                  date: "2019-12-09",
                  status: "sent"
              },
              {
                  date: "2019-12-10",
                  status: "delivered",
                  comments: "comments"
              }
          ]
      }
    }
  }
);

const fixture_values3 = JSON.stringify({
    description: "Allowed IP address",
    strategy: "NETWORK_VALIDATION",
    values: ["10.0.0.3/24"],
    operation: "EXIST",
    env: "default"
  }
);

test({
  name: "UNIT_PAYLOAD_SUITE - Should read keys from payload #1",
  fn(): void {
    const keys = payloadReader(JSON.parse(fixture_values2));
    assertArrayIncludes(keys, [                
        "product",
        "order",
        "order.qty",
        "order.deliver",
        "order.deliver.expect",        
        "order.deliver.tracking",      
        "order.deliver.tracking.date", 
        "order.deliver.tracking.status",
        "order.deliver.tracking.comments"
    ]);
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should read keys from payload #2",
  fn(): void {
    const keys = payloadReader(JSON.parse(fixture_values3));
    assertArrayIncludes(keys, [                
        "description",
        "strategy",
        "values",
        "operation",
        "env"
    ]);
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should read keys from payload with array values",
  fn(): void {
    const keys = payloadReader({
      order: {
          items: ["item_1", "item_2"]
      }
    });
    assertArrayIncludes(keys, [                
        "order",
        "order.items"
    ]);
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return TRUE when payload has field",
  fn(): void {
    assertEquals(true, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ["login"]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return FALSE when payload does not have field",
  fn(): void {
    assertEquals(false, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ["user"]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return TRUE when payload has nested field",
  fn(): void {
    assertEquals(true, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        "order.qty", "order.total"
    ]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return TRUE when payload has nested field with arrays",
  fn(): void {
    assertEquals(true, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        "order.deliver.tracking.status"
    ]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return TRUE when payload has all",
  fn(): void {
    assertEquals(true, processOperation( StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        "product",
        "order",
        "order.qty",
        "order.deliver",
        "order.deliver.expect",        
        "order.deliver.tracking",      
        "order.deliver.tracking.date", 
        "order.deliver.tracking.status"
    ]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return FALSE when payload does not have all",
  fn(): void {
    assertEquals(false, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        "product",
        "order",
        "order.NOT_EXIST_KEY",
    ]));
  }
});

test({
  name: "UNIT_PAYLOAD_SUITE - Should return FALSE when payload is not a JSON string",
  fn(): void {
    assertEquals(false, processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, "NOT_JSON", []));
  }
});