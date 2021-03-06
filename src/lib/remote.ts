// deno-lint-ignore-file no-explicit-any
import DateMoment from './utils/datemoment.ts';
import {
  ApiConnectionError,
  AuthError,
  CheckSwitcherError,
  CriteriaError,
  SnapshotServiceError,
} from './exceptions/index.ts';

const getConnectivityError = (code: string) => `Connection has been refused - ${code}`;

const getHeader = (token: string) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const getEntry = (input?: string[][]) => {
  if (!input) {
    return undefined;
  }

  if (input.flat().length % 2 !== 0) {
    throw new Error(`Invalid input format for '${input}'`);
  }

  const entry: any[] = [];
  for (const inputValues of input) {
    entry.push({
      strategy: inputValues[0],
      input: inputValues[1],
    });
  }

  return entry;
};

export const checkAPIHealth = async (url: string, options: any) => {
  try {
    const response = await fetch(`${url}/check`, { method: 'get' });
    if (response.status != 200) {
      throw new ApiConnectionError('API is offline');
    }
  } catch (_e) {
    if (options && 'silentMode' in options) {
      if (options.silentMode) {
        const expirationTime = new DateMoment(new Date())
          .add(options.retryTime, options.retryDurationIn).getDate();

        return {
          data: {
            token: 'SILENT',
            exp: expirationTime.getTime() / 1000,
          },
        };
      }
    }
  }
};

export const checkCriteria = async (
  context: any,
  key?: string,
  input?: string[][],
  showReason = false,
) => {
  try {
    const entry = getEntry(input);
    const response = await fetch(
      `${context.url}/criteria?showReason=${showReason}&key=${key}`,
      {
        method: 'post',
        body: JSON.stringify({ entry }),
        headers: getHeader(context.token),
      },
    );

    return response.json();
  } catch (e) {
    throw new CriteriaError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};

export const auth = async (context: any) => {
  try {
    const response = await fetch(`${context.url}/criteria/auth`, {
      method: 'post',
      body: JSON.stringify({
        domain: context.domain,
        component: context.component,
        environment: context.environment,
      }),
      headers: {
        'switcher-api-key': context.apiKey,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  } catch (e) {
    throw new AuthError(e.errno ? getConnectivityError(e.errno) : e.message);
  }
};

export const checkSwitchers = async (
  url: string,
  token: string,
  switcherKeys: string[],
) => {
  try {
    const response = await fetch(`${url}/criteria/switchers_check`, {
      method: 'post',
      body: JSON.stringify({ switchers: switcherKeys }),
      headers: getHeader(token),
    });

    const json = await response.json();
    if (response.status != 200) {
      throw new CriteriaError(json.errors[0].msg);
    }

    if (json.not_found.length) {
      throw new CheckSwitcherError(json.not_found);
    }
  } catch (e) {
    throw new CriteriaError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};

export const checkSnapshotVersion = async (
  url: string,
  token: string,
  version: number,
) => {
  try {
    const response = await fetch(`${url}/criteria/snapshot_check/${version}`, {
      method: 'get',
      headers: getHeader(token),
    });

    return response.json();
  } catch (e) {
    throw new SnapshotServiceError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};

export const resolveSnapshot = async (
  url: string,
  token: string,
  domain: string,
  environment: string,
  component: string,
) => {
  const data = {
    query: `
            query domain {
                domain(name: "${domain}", environment: "${environment}", _component: "${component}") {
                    name version activated
                    group { name activated
                        config { key activated
                            strategies { strategy activated operation values }
                            components
                        }
                    }
                }
            }`,
  };

  try {
    const response = await fetch(`${url}/graphql`, {
      method: 'post',
      body: JSON.stringify(data),
      headers: getHeader(token),
    });

    return JSON.stringify(await response.json(), null, 4);
  } catch (e) {
    throw new SnapshotServiceError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};
