import { existsSync } from '../deps.ts';

import DateMoment from './utils/datemoment.ts';
import IPCIDR from './utils/ipcidr.ts';
import TimedMatch from './utils/timed-match/index.ts';
import { parseJSON, payloadReader } from './utils/payloadReader.ts';
import { CheckSwitcherError } from './exceptions/index.ts';
import { checkSnapshotVersion, resolveSnapshot } from './remote.ts';
import type { Snapshot, Strategy } from '../types/index.d.ts';

/**
 * Strategy types that can be used to validate the switcher
 */
type StrategyKeys = 'NETWORK' | 'VALUE' | 'NUMERIC' | 'TIME' | 'DATE' | 'REGEX' | 'PAYLOAD';

/**
 * StrategiesType is a mapping of strategy keys to their string representations.
 * This is used to identify the type of validation strategy being applied.
 *
 * Each strategy corresponds to a specific validation method that can be applied to the switcher.
 * For example:
 *
 * - 'NETWORK_VALIDATION' is used for network-related validations,
 * - 'VALUE_VALIDATION' for simple value checks,
 * - 'NUMERIC_VALIDATION' for numeric comparisons,
 * - 'TIME_VALIDATION' for time-based checks,
 * - 'DATE_VALIDATION' for date comparisons,
 * - 'REGEX_VALIDATION' for regular expression matching,
 * - 'PAYLOAD_VALIDATION' for payload structure validations.
 */
export const StrategiesType: Readonly<Record<StrategyKeys, string>> = {
  NETWORK: 'NETWORK_VALIDATION',
  VALUE: 'VALUE_VALIDATION',
  NUMERIC: 'NUMERIC_VALIDATION',
  TIME: 'TIME_VALIDATION',
  DATE: 'DATE_VALIDATION',
  REGEX: 'REGEX_VALIDATION',
  PAYLOAD: 'PAYLOAD_VALIDATION',
};

/**
 * Operations that can be used to validate the switcher
 */
type OperationsKeys =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'EXIST'
  | 'NOT_EXIST'
  | 'GREATER'
  | 'LOWER'
  | 'BETWEEN'
  | 'HAS_ONE'
  | 'HAS_ALL';

export const OperationsType: Readonly<Record<OperationsKeys, string>> = {
  EQUAL: 'EQUAL',
  NOT_EQUAL: 'NOT_EQUAL',
  EXIST: 'EXIST',
  NOT_EXIST: 'NOT_EXIST',
  GREATER: 'GREATER',
  LOWER: 'LOWER',
  BETWEEN: 'BETWEEN',
  HAS_ONE: 'HAS_ONE',
  HAS_ALL: 'HAS_ALL',
};

export const loadDomain = (snapshotLocation: string, environment: string) => {
  let dataJSON;
  try {
    let dataBuffer;
    const snapshotFile = `${snapshotLocation}/${environment}.json`;
    if (existsSync(snapshotFile)) {
      dataBuffer = Deno.readTextFileSync(snapshotFile);
    } else {
      dataBuffer = JSON.stringify(
        { data: { domain: { version: 0 } } },
        null,
        4,
      );

      if (snapshotLocation.length) {
        Deno.mkdirSync(snapshotLocation, { recursive: true });
        Deno.writeTextFileSync(snapshotFile, dataBuffer);
      }
    }

    dataJSON = dataBuffer.toString();
    return JSON.parse(dataJSON);
  } catch (e) {
    throw new Error(
      `Something went wrong: It was not possible to load the file at ${snapshotLocation}`,
      { cause: e },
    );
  }
};

export const validateSnapshot = async (
  domain: string,
  environment: string,
  component: string,
  snapshotVersion: number,
) => {
  const { status } = await checkSnapshotVersion(snapshotVersion);

  if (!status) {
    const snapshot = await resolveSnapshot(domain, environment, component);
    return snapshot;
  }

  return undefined;
};

export const checkSwitchersLocal = (snapshot: Snapshot, switcherKeys: string[]) => {
  const { group } = snapshot.data.domain;
  const notFound = [];
  let found = false;

  for (const switcher of switcherKeys) {
    for (const g of group || []) {
      found = false;
      const { config } = g;

      if (config.find((c: { key: string }) => c.key === switcher)) {
        found = true;
        break;
      }
    }

    if (!found) {
      notFound.push(switcher);
    }
  }

  if (notFound.length) {
    throw new CheckSwitcherError(notFound);
  }
};

export const processOperation = async (
  strategyConfig: Strategy,
  input: string,
): Promise<boolean | undefined> => {
  const { strategy, operation, values } = strategyConfig;

  switch (strategy) {
    case StrategiesType.NETWORK:
      return processNETWORK(operation, input, values);
    case StrategiesType.VALUE:
      return processVALUE(operation, input, values);
    case StrategiesType.NUMERIC:
      return processNUMERIC(operation, input, values);
    case StrategiesType.TIME:
      return processTIME(operation, input, values);
    case StrategiesType.DATE:
      return processDATE(operation, input, values);
    case StrategiesType.REGEX:
      return await processREGEX(operation, input, values);
    case StrategiesType.PAYLOAD:
      return processPAYLOAD(operation, input, values);
  }
};

function processNETWORK(operation: string, input: string, values: string[]) {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[1-2]\d|3[0-2]))$/;
  switch (operation) {
    case OperationsType.EXIST:
      return processNETWORK_Exist(input, values, cidrRegex);
    case OperationsType.NOT_EXIST:
      return processNETWORK_NotExist(input, values, cidrRegex);
  }
  return false;
}

function processNETWORK_Exist(
  input: string,
  values: string[],
  cidrRegex: RegExp,
) {
  for (const value of values) {
    if (RegExp(cidrRegex).exec(value)) {
      const cidr = new IPCIDR(value);
      if (cidr.isIp4InCidr(input)) {
        return true;
      }
    } else {
      return values.includes(input);
    }
  }
  return false;
}

function processNETWORK_NotExist(
  input: string,
  values: string[],
  cidrRegex: RegExp,
) {
  const result = values.filter((element) => {
    if (RegExp(cidrRegex).exec(element)) {
      const cidr = new IPCIDR(element);
      if (cidr.isIp4InCidr(input)) {
        return true;
      }
    } else {
      return values.includes(input);
    }
  });
  return result.length === 0;
}

function processVALUE(operation: string, input: string, values: string[]) {
  switch (operation) {
    case OperationsType.EXIST:
      return values.includes(input);
    case OperationsType.NOT_EXIST:
      return !values.includes(input);
    case OperationsType.EQUAL:
      return input === values[0];
    case OperationsType.NOT_EQUAL: {
      const result = values.filter((element) => element === input);
      return result.length === 0;
    }
  }
}

function processNUMERIC(operation: string, input: string, values: string[]) {
  const inputStr = String(input);
  switch (operation) {
    case OperationsType.EXIST:
      return values.includes(inputStr);
    case OperationsType.NOT_EXIST:
      return !values.includes(inputStr);
    case OperationsType.EQUAL:
      return inputStr === values[0];
    case OperationsType.NOT_EQUAL:
      return values.filter((element) => element === inputStr).length === 0;
    case OperationsType.LOWER:
      return inputStr < values[0];
    case OperationsType.GREATER:
      return inputStr > values[0];
    case OperationsType.BETWEEN:
      return inputStr >= values[0] && inputStr <= values[1];
  }
}

function processTIME(operation: string, input: string, values: string[]) {
  const dateMoment = new DateMoment(new Date(), input);

  switch (operation) {
    case OperationsType.LOWER:
      return dateMoment.isSameOrBefore(dateMoment.getDate(), values[0]);
    case OperationsType.GREATER:
      return dateMoment.isSameOrAfter(dateMoment.getDate(), values[0]);
    case OperationsType.BETWEEN:
      return dateMoment.isBetween(
        dateMoment.getDate(),
        dateMoment.getDate(),
        values[0],
        values[1],
      );
  }
}

function processDATE(operation: string, input: string, values: string[]) {
  const dateMoment = new DateMoment(input);

  switch (operation) {
    case OperationsType.LOWER:
      return dateMoment.isSameOrBefore(values[0]);
    case OperationsType.GREATER:
      return dateMoment.isSameOrAfter(values[0]);
    case OperationsType.BETWEEN:
      return dateMoment.isBetween(values[0], values[1]);
  }
}

async function processREGEX(
  operation: string,
  input: string,
  values: string[],
): Promise<boolean> {
  switch (operation) {
    case OperationsType.EXIST:
      return await TimedMatch.tryMatch(values, input);
    case OperationsType.NOT_EXIST:
      return !(await processREGEX(OperationsType.EXIST, input, values));
    case OperationsType.EQUAL:
      return await TimedMatch.tryMatch([`\\b${values[0]}\\b`], input);
    case OperationsType.NOT_EQUAL:
      return !(await TimedMatch.tryMatch([`\\b${values[0]}\\b`], input));
    default:
      return false;
  }
}

function processPAYLOAD(operation: string, input: string, values: string[]) {
  const inputJson = parseJSON(input);
  if (!inputJson) {
    return false;
  }

  const keys = payloadReader(inputJson);
  switch (operation) {
    case OperationsType.HAS_ONE:
      return keys.filter((key) => values.includes(key)).length > 0;
    case OperationsType.HAS_ALL:
      return values.every((element) => keys.includes(element));
  }
}
