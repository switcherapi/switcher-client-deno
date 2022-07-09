import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

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

test({
  name: "Should agree when input EXIST in values - String type",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EXIST, "3", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input exist but test as DOES NOT EXIST ",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, "1", mock_values2);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input DOES NOT EXIST in values",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EXIST, "2", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is EQUAL to value",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, "1", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is not equal but test as EQUAL",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.EQUAL, "2", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is NOT EQUAL to value",
  fn(): void {
    const result = processOperation(StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, "2", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is GREATER than value",
  fn(): void {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "2", mock_values1);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.01", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.55", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is lower but tested as GREATER than value",
  fn(): void {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "0", mock_values1);
    assertEquals(false, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "0.99", mock_values1);
    assertEquals(false, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.GREATER, "1.49", mock_values3);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is LOWER than value",
  fn(): void {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "0", mock_values1);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "0.99", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.LOWER, "1.49", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is BETWEEN values",
  fn(): void {
    let result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "1", mock_values2);
    assertEquals(true, result);

    // test decimal
    result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "2.99", mock_values2);
    assertEquals(true, result);

    result = processOperation(StrategiesType.NUMERIC, OperationsType.BETWEEN, "1.001", mock_values2);
    assertEquals(true, result);
  }
});
