import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

const mock_values1 = [
  "08:00",
];

const mock_values2 = [
  "08:00",
  "10:00",
];

test({
  name: "Should agree when input is LOWER",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "06:00", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is LOWER or SAME",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "08:00", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT LOWER",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.LOWER, "10:00", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is GREATER",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "10:00", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is GREATER or SAME",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "08:00", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT GREATER",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.GREATER, "06:00", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is in BETWEEN",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.BETWEEN, "09:00", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT in BETWEEN",
  fn(): void {
    const result = processOperation(StrategiesType.TIME, OperationsType.BETWEEN, "07:00", mock_values2);
    assertEquals(false, result);
  }
});
