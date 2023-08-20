import { AuthError, CheckSwitcherError, CriteriaError, SnapshotServiceError } from './exceptions/index.ts';
import { Criteria, Entry, SwitcherContext } from '../types/index.d.ts';

let httpClient: Deno.HttpClient;

const getConnectivityError = (code: string) => `Connection has been refused - ${code}`;

const getHeader = (token: string | undefined) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const setCerts = (certPath: string) => {
  httpClient = Deno.createHttpClient({
    caCerts: [Deno.readTextFileSync(certPath)],
    http2: true,
  });
};

export const getEntry = (input?: string[][]) => {
  if (!input) {
    return undefined;
  }

  if (input.flat().length % 2 !== 0) {
    throw new Error(`Invalid input format for '${input}'`);
  }

  const entry: Entry[] = [];
  for (const inputValues of input) {
    entry.push({
      strategy: inputValues[0],
      input: inputValues[1],
    });
  }

  return entry;
};

export const checkAPIHealth = async (url: string) => {
  try {
    const response = await fetch(`${url}/check`, { client: httpClient, method: 'get' });
    return response.status == 200;
  } catch (_e) {
    return false;
  }
};

export const checkCriteria = async (
  context: SwitcherContext,
  key?: string,
  input?: string[][],
  showReason = false,
): Promise<Criteria> => {
  try {
    const entry = getEntry(input);
    const response = await fetch(
      `${context.url}/criteria?showReason=${showReason}&key=${key}`,
      {
        client: httpClient,
        method: 'post',
        body: JSON.stringify({ entry }),
        headers: getHeader(context.token),
      },
    );

    if (response.status == 200) {
      return response.json();
    }

    throw new Error(`[checkCriteria] failed with status ${response.status}`);
  } catch (e) {
    throw new CriteriaError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};

export const auth = async (context: SwitcherContext) => {
  try {
    const response = await fetch(`${context.url}/criteria/auth`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify({
        domain: context.domain,
        component: context.component,
        environment: context.environment,
      }),
      headers: {
        'switcher-api-key': context.apiKey || '',
        'Content-Type': 'application/json',
      },
    });

    if (response.status == 200) {
      return response.json();
    }

    throw new Error(`[auth] failed with status ${response.status}`);
  } catch (e) {
    throw new AuthError(e.errno ? getConnectivityError(e.errno) : e.message);
  }
};

export const checkSwitchers = async (
  url: string,
  token: string | undefined,
  switcherKeys: string[],
) => {
  try {
    const response = await fetch(`${url}/criteria/switchers_check`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify({ switchers: switcherKeys }),
      headers: getHeader(token),
    });

    if (response.status != 200) {
      throw new Error(`[checkSwitchers] failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.not_found.length) {
      throw new CheckSwitcherError(json.not_found);
    }
  } catch (e) {
    if (e instanceof CheckSwitcherError) {
      throw e;
    }

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
      client: httpClient,
      method: 'get',
      headers: getHeader(token),
    });

    if (response.status == 200) {
      return response.json();
    }

    throw new Error(`[checkSnapshotVersion] failed with status ${response.status}`);
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
      client: httpClient,
      method: 'post',
      body: JSON.stringify(data),
      headers: getHeader(token),
    });

    if (response.status == 200) {
      return JSON.stringify(await response.json(), null, 4);
    }

    throw new Error(`[resolveSnapshot] failed with status ${response.status}`);
  } catch (e) {
    throw new SnapshotServiceError(
      e.errno ? getConnectivityError(e.errno) : e.message,
    );
  }
};
