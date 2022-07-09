import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

describe("Strategy [TIME] tests:", function () {
  const mock_values1 = [
    "08:00",
  ];

  const mock_values2 = [
    "08:00",
    "10:00",
  ];

  it("Should agree when input is LOWER", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "06:00", mock_values1);
    assertEquals(true, result);
  });

  it("Should agree when input is LOWER or SAME", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "08:00", mock_values1);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT LOWER", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "10:00", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is GREATER", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "10:00", mock_values1);
    assertEquals(true, result);
  });

  it("Should agree when input is GREATER or SAME", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "08:00", mock_values1);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT GREATER", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "06:00", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is in BETWEEN", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.BETWEEN, "09:00", mock_values2);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT in BETWEEN", function () {
    const result = processOperation(StrategiesType.TIME, OperationsType.BETWEEN, "07:00", mock_values2);
    assertEquals(false, result);
  });

});
