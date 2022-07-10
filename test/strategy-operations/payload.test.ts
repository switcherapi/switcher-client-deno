import { assertFalse, assertArrayIncludes } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import { assertTrue } from "../helper/utils.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";
import { payloadReader } from "../../src/lib/utils/payloadReader.ts";

describe("Strategy [PAYLOAD] tests:", function () {
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

  it("Should read keys from payload #1", function () {
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
  });

  it("Should read keys from payload #2", function () {
    const keys = payloadReader(JSON.parse(fixture_values3));
    assertArrayIncludes(keys, [                
        "description",
        "strategy",
        "values",
        "operation",
        "env"
    ]);
  });

  it("Should read keys from payload with array values", function () {
    const keys = payloadReader({
      order: {
          items: ["item_1", "item_2"]
      }
    });
    assertArrayIncludes(keys, [                
        "order",
        "order.items"
    ]);
  });

  it("Should return TRUE when payload has field", function () {
    assertTrue(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ["login"]));
  });

  it("Should return FALSE when payload does not have field", function () {
    assertFalse(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ["user"]));
  });

  it("Should return TRUE when payload has nested field", function () {
    assertTrue(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        "order.qty", "order.total"
    ]));
  });

  it("Should return TRUE when payload has nested field with arrays", function () {
    assertTrue(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
        "order.deliver.tracking.status"
    ]));
  });

  it("Should return TRUE when payload has all", function () {
    assertTrue(processOperation( StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        "product",
        "order",
        "order.qty",
        "order.deliver",
        "order.deliver.expect",        
        "order.deliver.tracking",      
        "order.deliver.tracking.date", 
        "order.deliver.tracking.status"
    ]));
  });

  it("Should return FALSE when payload does not have all", function () {
    assertFalse(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
        "product",
        "order",
        "order.NOT_EXIST_KEY",
    ]));
  });

  it("Should return FALSE when payload is not a JSON string", function () {
    assertFalse(processOperation(StrategiesType.PAYLOAD, OperationsType.HAS_ALL, "NOT_JSON", []));
  });

});