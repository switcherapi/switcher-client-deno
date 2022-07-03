// deno-lint-ignore-file
import { existsSync } from "https://deno.land/std@0.110.0/fs/mod.ts";

import DateMoment from "./utils/datemoment.ts";
import { parseJSON, payloadReader } from "./utils/payloadReader.ts";
import { CheckSwitcherError } from "./exceptions/index.ts";
import { checkSnapshotVersion, resolveSnapshot } from "./remote.ts";

export const loadDomain = (snapshotLocation: string, environment: string) => {
  try {
    let dataBuffer;
    const snapshotFile = `${snapshotLocation}${environment}.json`;
    if (existsSync(snapshotFile)) {
      dataBuffer = Deno.readFileSync(snapshotFile);
    } else {
      dataBuffer = JSON.stringify(
        { data: { domain: { version: 0 } } },
        null,
        4,
      );
      Deno.mkdirSync(snapshotLocation, { recursive: true });
      Deno.writeTextFile(snapshotFile, dataBuffer);
    }

    const dataJSON = dataBuffer.toString();
    return JSON.parse(dataJSON);
  } catch (_e) {
    throw new Error(
      `Something went wrong: It was not possible to load the file at ${snapshotLocation}`,
    );
  }
};

export const validateSnapshot = async (
  context: any,
  snapshotLocation: string,
  snapshotVersion: number,
) => {
  const { status } = await checkSnapshotVersion(
    context.url,
    context.token,
    snapshotVersion,
  );

  if (!status) {
    const snapshot = await resolveSnapshot(
      context.url,
      context.token,
      context.domain,
      context.environment,
      context.component,
    );

    Deno.writeTextFile(
      `${snapshotLocation}${context.environment}.json`,
      snapshot,
    );
    return true;
  }
  return false;
};

export const checkSwitchers = (snapshot: any, switcherKeys: string[]) => {
  const { group } = snapshot.data.domain;
  const notFound = [];
  let found = false;

  for (const switcher of switcherKeys) {
    for (const g of group) {
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

export const StrategiesType = Object.freeze({
  NETWORK: "NETWORK_VALIDATION",
  VALUE: "VALUE_VALIDATION",
  NUMERIC: "NUMERIC_VALIDATION",
  TIME: "TIME_VALIDATION",
  DATE: "DATE_VALIDATION",
  REGEX: "REGEX_VALIDATION",
  PAYLOAD: "PAYLOAD_VALIDATION",
});

export const OperationsType = Object.freeze({
  EQUAL: "EQUAL",
  NOT_EQUAL: "NOT_EQUAL",
  EXIST: "EXIST",
  NOT_EXIST: "NOT_EXIST",
  GREATER: "GREATER",
  LOWER: "LOWER",
  BETWEEN: "BETWEEN",
  HAS_ONE: "HAS_ONE",
  HAS_ALL: "HAS_ALL",
});

export const processOperation = (
  strategy: string,
  operation: string,
  input: string,
  values: string[],
) => {
  switch (strategy) {
    // case StrategiesType.NETWORK:
    //     return processNETWORK(operation, input, values);
    case StrategiesType.VALUE:
      return processVALUE(operation, input, values);
    case StrategiesType.NUMERIC:
      return processNUMERIC(operation, input, values);
    case StrategiesType.TIME:
      return processTIME(operation, input, values);
    case StrategiesType.DATE:
      return processDATE(operation, input, values);
    case StrategiesType.REGEX:
      return processREGEX(operation, input, values);
    case StrategiesType.PAYLOAD:
      return processPAYLOAD(operation, input, values);
  }
};

// function processNETWORK(operation: string, input: string, values: string[]) {
//     const cidrRegex = /^([\d]{1,3}\.){3}[\d]{1,3}(\/([\d]|[1-2][\d]|3[0-2]))$/;
//     switch(operation) {
//         case OperationsType.EXIST:
//             return processNETWORK_Exist(input, values, cidrRegex);
//         case OperationsType.NOT_EXIST:
//             return processNETWORK_NotExist(input, values, cidrRegex);
//     }
//     return false;
// }

// function processNETWORK_Exist(input: string, values: string[], cidrRegex: string) {
//     for (const value of values) {
//         if (value.match(cidrRegex)) {
//             const cidr = new IPCIDR(value);
//             if (cidr.contains(input)) {
//                 return true;
//             }
//         } else {
//             return values.includes(input);
//         }
//     }
//     return false;
// }

// function processNETWORK_NotExist(input: string, values: string[], cidrRegex: string) {
//     const result = values.filter(element => {
//         if (element.match(cidrRegex)) {
//             const cidr = new IPCIDR(element);
//             if (cidr.contains(input)) {
//                 return true;
//             }
//         } else {
//             return values.includes(input);
//         }
//     });
//     return result.length === 0;
// }

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

function processREGEX(
  operation: string,
  input: string,
  values: string[],
): boolean | undefined {
  switch (operation) {
    case OperationsType.EXIST: {
      for (const value of values) {
        if (input.match(value)) {
          return true;
        }
      }
      return false;
    }
    case OperationsType.NOT_EXIST:
      return !processREGEX(OperationsType.EXIST, input, values);
    case OperationsType.EQUAL:
      return input.match(`\\b${values[0]}\\b`) != null;
    case OperationsType.NOT_EQUAL:
      return !processREGEX(OperationsType.EQUAL, input, values);
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
