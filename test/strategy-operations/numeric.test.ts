import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

describe("Strategy [NUMERIC] tests:", function () {
  const mock_values1 = [
    "1",
  ];

  const mock_values2 = [
    "1",
    "3",
  ];

  const mock_values3 = [
    "1.5",
  ];

  it("Should agree when input EXIST in values - String type", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EXIST, "3", mock_values2);
    assertEquals(true, result);
  });

  it("Should NOT agree when input exist but test as DOES NOT EXIST ", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, "1", mock_values2);
    assertEquals(false, result);
  });

  it("Should agree when input DOES NOT EXIST in values", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, "2", mock_values2);
    assertEquals(true, result);
  });

  it("Should agree when input is EQUAL to value", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, "1", mock_values1);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is not equal but test as EQUAL", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, "2", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is NOT EQUAL to value", function () {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, "2", mock_values1);
    assertEquals(true, result);
  });

  it("Should agree when input is GREATER than value", function () {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "2", mock_values1);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.01", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.55", mock_values3);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is lower but tested as GREATER than value", function () {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "0", mock_values1);
    assertEquals(false, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "0.99", mock_values1);
    assertEquals(false, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.49", mock_values3);
    assertEquals(false, result);
  });

  it("Should agree when input is LOWER than value", function () {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "0", mock_values1);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "0.99", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "1.49", mock_values3);
    assertEquals(true, result);
  });

  it("Should agree when input is BETWEEN values", function () {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "1", mock_values2);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "2.99", mock_values2);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "1.001", mock_values2);
    assertEquals(true, result);
  });

});
