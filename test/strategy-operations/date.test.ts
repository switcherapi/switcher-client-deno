import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

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

test({
  name: "Should agree when input is LOWER",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-11-26", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is LOWER or SAME",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT LOWER",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-02", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is GREATER",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-02", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when input is GREATER or SAME",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-01", mock_values1);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT GREATER",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-11-10", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is in BETWEEN",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.BETWEEN, "2019-12-03", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT in BETWEEN",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.BETWEEN, "2019-12-12", mock_values2);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is LOWER including time",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01T07:00", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when input is NOT LOWER including time",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.LOWER, "2019-12-01T07:00", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when input is GREATER including time",
  fn(): void {
    const result = processOperation(StrategiesType.DATE, OperationsType.GREATER, "2019-12-01T08:40", mock_values3);
    assertEquals(true, result);
  }
});
