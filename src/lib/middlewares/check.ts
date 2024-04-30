import { StrategiesType } from '../snapshot.ts';

/**
 * Adds VALUE_VALIDATION input for strategy validation
 */
export function checkValue(input: string): string[] {
  return [StrategiesType.VALUE, input];
}

/**
 * Adds NUMERIC_VALIDATION input for strategy validation
 */
export function checkNumeric(input: string): string[] {
  return [StrategiesType.NUMERIC, input];
}

/**
 * Adds NETWORK_VALIDATION input for strategy validation
 */
export function checkNetwork(input: string): string[] {
  return [StrategiesType.NETWORK, input];
}

/**
 * Adds DATE_VALIDATION input for strategy validation
 */
export function checkDate(input: string): string[] {
  return [StrategiesType.DATE, input];
}

/**
 * Adds TIME_VALIDATION input for strategy validation
 */
export function checkTime(input: string): string[] {
  return [StrategiesType.TIME, input];
}

/**
 * Adds REGEX_VALIDATION input for strategy validation
 */
export function checkRegex(input: string): string[] {
  return [StrategiesType.REGEX, input];
}

/**
 * Adds PAYLOAD_VALIDATION input for strategy validation
 */
export function checkPayload(input: string): string[] {
  return [StrategiesType.PAYLOAD, input];
}
