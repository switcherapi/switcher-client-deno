import { assertFalse } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import { assertTrue } from "../helper/utils.ts";
import {
  OperationsType,
  processOperation,
  StrategiesType,
} from "../../src/lib/snapshot.ts";

describe("Strategy [NETWORK] tests:", function () {
  const mock_values1 = [
    "10.0.0.0/30",
  ];

  const mock_values2 = [
    "10.0.0.0/30",
    "192.168.0.0/30",
  ];

  const mock_values3 = [
    "192.168.56.56",
    "192.168.56.57",
    "192.168.56.58",
  ];

  it("Should agree when input range EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.EXIST, "10.0.0.3", mock_values1);
    assertTrue(result);
  });

  it("Should NOT agree when input range DOES NOT EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.EXIST, "10.0.0.4", mock_values1);
    assertFalse(result);
  });

  it("Should agree when input DOES NOT EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, "10.0.0.4", mock_values1);
    assertTrue(result);
  });

  it("Should NOT agree when input EXIST but assumed that it DOES NOT EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, "10.0.0.3", mock_values1);
    assertFalse(result);
  });

  it("Should agree when input IP EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.EXIST, "192.168.56.58", mock_values3);
    assertTrue(result);
  });

  it("Should agree when input IP DOES NOT EXIST", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, "192.168.56.50", mock_values3);
    assertTrue(result);
  });

  it("Should agree when input range EXIST for multiple ranges", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.EXIST, "192.168.0.3", mock_values2);
    assertTrue(result);
  });

  it("Should NOT agree when input range DOES NOT EXIST for multiple ranges", function () {
    const result = processOperation(StrategiesType.NETWORK, OperationsType.NOT_EXIST, "127.0.0.0", mock_values2);
    assertTrue(result);
  });

});