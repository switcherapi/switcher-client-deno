import { CheckSwitcherError, ClientError, RemoteError } from './exceptions/index.ts';
import type { AuthResponse, CheckSnapshotVersionResponse, Entry, SwitcherContext } from '../types/index.d.ts';
import type { SwitcherResult } from './result.ts';
import * as util from './utils/index.ts';
import { GlobalAuth } from './globals/globalAuth.ts';

let httpClient: Deno.HttpClient;

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

  const entry: Entry[] = [];
  for (const inputValues of input) {
    entry.push({
      strategy: inputValues[0],
      input: inputValues[1],
    });
  }

  return entry;
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
        'switcher-api-key': util.get(context.apiKey, ''),
        'Content-Type': 'application/json',
      },
    });

    if (response.status == 200) {
      return response.json() as Promise<AuthResponse>;
    }

    throw new RemoteError(`[auth] failed with status ${response.status}`);
  } catch (e) {
    throw errorHandler(e);
  }
};

export const checkAPIHealth = async (url: string) => {
  try {
    const response = await fetch(`${url}/check`, { client: httpClient, method: 'get' });
    return response.status == 200;
  } catch {
    return false;
  }
};

export const checkCriteria = async (
  key?: string,
  input?: string[][],
  showDetail = false,
) => {
  try {
    const entry = getEntry(input);
    const response = await fetch(
      `${GlobalAuth.url}/criteria?showReason=${showDetail}&key=${key}`,
      {
        client: httpClient,
        method: 'post',
        body: JSON.stringify({ entry }),
        headers: getHeader(GlobalAuth.token),
      },
    );

    if (response.status == 200) {
      return response.json() as Promise<SwitcherResult>;
    }

    throw new RemoteError(`[checkCriteria] failed with status ${response.status}`);
  } catch (e) {
    throw errorHandler(e);
  }
};

export const checkSwitchers = async (
  switcherKeys: string[],
) => {
  try {
    const response = await fetch(`${GlobalAuth.url}/criteria/switchers_check`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify({ switchers: switcherKeys }),
      headers: getHeader(GlobalAuth.token),
    });

    if (response.status != 200) {
      throw new RemoteError(`[checkSwitchers] failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.not_found?.length) {
      throw new CheckSwitcherError(json.not_found);
    }
  } catch (e) {
    throw errorHandler(e);
  }
};

export const checkSnapshotVersion = async (
  version: number,
) => {
  try {
    const response = await fetch(`${GlobalAuth.url}/criteria/snapshot_check/${version}`, {
      client: httpClient,
      method: 'get',
      headers: getHeader(GlobalAuth.token),
    });

    if (response.status == 200) {
      return response.json() as Promise<CheckSnapshotVersionResponse>;
    }

    throw new RemoteError(`[checkSnapshotVersion] failed with status ${response.status}`);
  } catch (e) {
    throw errorHandler(e);
  }
};

export const resolveSnapshot = async (
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
              relay { type activated }
              components
            }
          }
        }
      }`,
  };

  try {
    const response = await fetch(`${GlobalAuth.url}/graphql`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify(data),
      headers: getHeader(GlobalAuth.token),
    });

    if (response.status == 200) {
      return JSON.stringify(await response.json(), null, 4);
    }

    throw new RemoteError(`[resolveSnapshot] failed with status ${response.status}`);
  } catch (e) {
    throw errorHandler(e);
  }
};

function errorHandler(error: unknown) {
  if (!(error instanceof ClientError)) {
    const e = error as { errno?: string; message: string };
    throw new RemoteError(e.errno ? `Connection has been refused - ${e.errno}` : e.message);
  }

  throw error;
}
