import { StrategiesType } from "../snapshot.ts";

export function checkValue(input: string) {
  return [StrategiesType.VALUE, input];
}

export function checkNumeric(input: string) {
  return [StrategiesType.NUMERIC, input];
}

export function checkNetwork(input: string) {
  return [StrategiesType.NETWORK, input];
}

export function checkDate(input: string) {
  return [StrategiesType.DATE, input];
}

export function checkTime(input: string) {
  return [StrategiesType.TIME, input];
}

export function checkRegex(input: string) {
  return [StrategiesType.REGEX, input];
}

export function checkPayload(input: string) {
  return [StrategiesType.PAYLOAD, input];
}
