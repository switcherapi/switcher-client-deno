import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

const mock_values1 = [
  "USER_1",
];

const mock_values2 = [
  "USER_1",
  "USER_2",
];

test({
  name: "Should agree when input EXIST",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.EXIST, "USER_1", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input DOES NOT EXIST",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.EXIST, "USER_123", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input DOES NOT EXIST",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.NOT_EXIST, "USER_123", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is EQUAL",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.EQUAL, "USER_1", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT EQUAL",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.EQUAL, "USER_2", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is NOT EQUAL",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.NOT_EQUAL, "USER_123", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT EQUAL",
  fn(): void {
    const result = processOperation(StrategiesType.VALUE, OperationsType.NOT_EQUAL, "USER_2", mock_values2);
    assertEquals(false, result);
  }
});
