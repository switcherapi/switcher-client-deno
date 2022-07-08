import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
    processOperation,
    StrategiesType,
    OperationsType
} from "../../src/lib/snapshot.ts";

const { test } = Deno;

const mock_values1 = [
    "10.0.0.0/30"
];

const mock_values2 = [
    "10.0.0.0/30", "192.168.0.0/30"
];

const mock_values3 = [
    "192.168.56.56",
    "192.168.56.57",
    "192.168.56.58"
];

test({
    name: "Should agree when input range EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.EXIST, "10.0.0.3", mock_values1);
    assertEquals(true, result);
    }
});

test({
    name: "Should NOT agree when input range DOES NOT EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.EXIST, "10.0.0.4", mock_values1);
    assertEquals(false, result);
    }
});

test({
    name: "Should agree when input DOES NOT EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.NOT_EXIST, "10.0.0.4", mock_values1);
    assertEquals(true, result);
    }
});

test({
    name: "Should NOT agree when input EXIST but assumed that it DOES NOT EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.NOT_EXIST, "10.0.0.3", mock_values1);
    assertEquals(false, result);
    }
});

test({
    name: "Should agree when input IP EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.EXIST, "192.168.56.58", mock_values3);
    assertEquals(true, result);
    }
});

test({
    name: "Should agree when input IP DOES NOT EXIST", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.NOT_EXIST, "192.168.56.50", mock_values3);
    assertEquals(true, result);
    }
});

test({
    name: "Should agree when input range EXIST for multiple ranges", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.EXIST, "192.168.0.3", mock_values2);
    assertEquals(true, result);
    }
});

test({
    name: "Should NOT agree when input range DOES NOT EXIST for multiple ranges", 
    fn(): void {
    const result = processOperation(
        StrategiesType.NETWORK, OperationsType.NOT_EXIST, "127.0.0.0", mock_values2);
    assertEquals(true, result);
    }
});