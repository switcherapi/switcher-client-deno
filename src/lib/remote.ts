import { AuthError, CheckSwitcherError, CriteriaError, SnapshotServiceError } from './exceptions/index.ts';
import type {
  AuthResponse,
  CheckSnapshotVersionResponse,
  Entry,
  ResultDetail,
  SwitcherContext,
} from '../types/index.d.ts';
import { Auth } from './remote-auth.ts';
import * as util from './utils/index.ts';

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

    throw new Error(`[auth] failed with status ${response.status}`);
  } catch (e) {
    const error = e as { errno?: string; message: string };
    throw new AuthError(error.errno ? getConnectivityError(error.errno) : error.message);
  }
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
  key?: string,
  input?: string[][],
  showDetail = false,
) => {
  try {
    const entry = getEntry(input);
    const response = await fetch(
      `${Auth.getURL()}/criteria?showReason=${showDetail}&key=${key}`,
      {
        client: httpClient,
        method: 'post',
        body: JSON.stringify({ entry }),
        headers: getHeader(Auth.getToken()),
      },
    );

    if (response.status == 200) {
      return response.json() as Promise<ResultDetail>;
    }

    throw new Error(`[checkCriteria] failed with status ${response.status}`);
  } catch (e) {
    const error = e as { errno?: string; message: string };
    throw new CriteriaError(
      error.errno ? getConnectivityError(error.errno) : error.message,
    );
  }
};

export const checkSwitchers = async (
  switcherKeys: string[],
) => {
  try {
    const response = await fetch(`${Auth.getURL()}/criteria/switchers_check`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify({ switchers: switcherKeys }),
      headers: getHeader(Auth.getToken()),
    });

    if (response.status != 200) {
      throw new Error(`[checkSwitchers] failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.not_found?.length) {
      throw new CheckSwitcherError(json.not_found);
    }
  } catch (e) {
    if (e instanceof CheckSwitcherError) {
      throw e;
    }

    const error = e as { errno?: string; message: string };
    throw new CriteriaError(
      error.errno ? getConnectivityError(error.errno) : error.message,
    );
  }
};

export const checkSnapshotVersion = async (
  version: number,
) => {
  try {
    const response = await fetch(`${Auth.getURL()}/criteria/snapshot_check/${version}`, {
      client: httpClient,
      method: 'get',
      headers: getHeader(Auth.getToken()),
    });

    if (response.status == 200) {
      return response.json() as Promise<CheckSnapshotVersionResponse>;
    }

    throw new Error(`[checkSnapshotVersion] failed with status ${response.status}`);
  } catch (e) {
    const error = e as { errno?: string; message: string };
    throw new SnapshotServiceError(
      error.errno ? getConnectivityError(error.errno) : error.message,
    );
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
              components
            }
          }
        }
      }`,
  };

  try {
    const response = await fetch(`${Auth.getURL()}/graphql`, {
      client: httpClient,
      method: 'post',
      body: JSON.stringify(data),
      headers: getHeader(Auth.getToken()),
    });

    if (response.status == 200) {
      return JSON.stringify(await response.json(), null, 4);
    }

    throw new Error(`[resolveSnapshot] failed with status ${response.status}`);
  } catch (e) {
    const error = e as { errno?: string; message: string };
    throw new SnapshotServiceError(
      error.errno ? getConnectivityError(error.errno) : error.message,
    );
  }
};
