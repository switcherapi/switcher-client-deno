import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

describe("Strategy [DATE] tests:", function () {
  const mock_values1 = [
    "2019-12-01",
  ];

  const mock_values2 = [
    "2019-12-01",
    "2019-12-05",
  ];

  const mock_values3 = [
    "2019-12-01T08:30",
  ];

  it("Should agree when input is LOWER", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-11-26", mock_values1);
    assertEquals(true, result);
  });

  it("Should agree when input is LOWER or SAME", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01", mock_values1);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT LOWER", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-02", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is GREATER", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-02", mock_values1);
    assertEquals(true, result);
  });

  it("Should agree when input is GREATER or SAME", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-01", mock_values1);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT GREATER", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-11-10", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is in BETWEEN", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.BETWEEN, "2019-12-03", mock_values2);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT in BETWEEN", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.BETWEEN, "2019-12-12", mock_values2);
    assertEquals(false, result);
  });

  it("Should agree when input is LOWER including time", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01T07:00", mock_values3);
    assertEquals(true, result);
  });

  it("Should NOT agree when input is NOT LOWER including time", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01T07:00", mock_values1);
    assertEquals(false, result);
  });

  it("Should agree when input is GREATER including time", function () {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-01T08:40", mock_values3);
    assertEquals(true, result);
  });

});
