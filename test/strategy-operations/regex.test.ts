import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

const mock_values1 = [
  "\\bUSER_[0-9]{1,2}\\b",
];

const mock_values2 = [
  "\\bUSER_[0-9]{1,2}\\b",
  "\\buser-[0-9]{1,2}\\b",
];

const mock_values3 = [
  "USER_[0-9]{1,2}",
];

test({
  name: "Should agree when expect to exist using EXIST operation",
  fn(): void {
    let result = processOperation(StrategiesType.REGEX, OperationsType.EXIST, "USER_1", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.REGEX, OperationsType.EXIST, "user-01", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when expect to exist using EXIST operation",
  fn(): void {
    let result = processOperation(StrategiesType.REGEX, OperationsType.EXIST, "USER_123", mock_values1);
    assertEquals(false, result);

    //mock_values3 does not require exact match
    result = processOperation(StrategiesType.REGEX, OperationsType.EXIST, "USER_123", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should agree when expect to not exist using NOT_EXIST operation",
  fn(): void {
    let result = processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, "USER_123", mock_values1);
    assertEquals(true, result);

    result = processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, "user-123", mock_values2);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when expect to not exist using NOT_EXIST operation",
  fn(): void {
    const result = processOperation(StrategiesType.REGEX, OperationsType.NOT_EXIST, "USER_12", mock_values1);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when expect to be equal using EQUAL operation",
  fn(): void {
    const result = processOperation(StrategiesType.REGEX, OperationsType.EQUAL, "USER_11", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when expect to be equal using EQUAL operation",
  fn(): void {
    const result = processOperation(StrategiesType.REGEX, OperationsType.EQUAL, "user-11", mock_values3);
    assertEquals(false, result);
  }
});

test({
  name: "Should agree when expect to not be equal using NOT_EQUAL operation",
  fn(): void {
    const result = processOperation(StrategiesType.REGEX, OperationsType.NOT_EQUAL, "USER_123", mock_values3);
    assertEquals(true, result);
  }
});

test({
  name: "Should NOT agree when expect to not be equal using NOT_EQUAL operation",
  fn(): void {
    const result = processOperation(StrategiesType.REGEX, OperationsType.NOT_EQUAL, "USER_1", mock_values3);
    assertEquals(false, result);
  }
});