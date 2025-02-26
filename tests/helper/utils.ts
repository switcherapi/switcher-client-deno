import { assertEquals, mf } from '../deps.ts';

export function given(route: string, expect: object | undefined, status = 200) {
  mf.mock(route, (_req, _match) => {
    return new Response(JSON.stringify(expect), {
      status,
    });
  });
}

export function givenError(route: string, expect: string) {
  mf.mock(route, () => {
    throw new HttpError(expect);
  });
}

export function tearDown() {
  mf.uninstall();
  mf.install();
}

export function assertTrue(value: object | boolean | undefined) {
  assertEquals(value, true);
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateAuth(token: string | undefined, seconds: number) {
  return {
    token,
    exp: (Date.now() + (seconds * 1000)) / 1000,
  };
}

export function generateResult(result?: boolean) {
  return {
    result,
  };
}

export function generateDetailedResult(detailedResult: object) {
  return detailedResult;
}

export function generateStatus(status: boolean) {
  return {
    status,
  };
}

export class WaitSafe {
  private static timelimit = 5000;
  private static exit: boolean;

  static async wait() {
    WaitSafe.exit = false;

    const timelimit = Date.now() + WaitSafe.timelimit;
    let timer = Date.now();
    while (!WaitSafe.exit && timer < timelimit) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      timer = Date.now();
    }
  }

  static finish() {
    WaitSafe.exit = true;
  }

  static limit(timelimit: number) {
    WaitSafe.timelimit = timelimit;
  }
}

class HttpError {
  errno: string;
  constructor(errno: string) {
    this.errno = errno;
  }
}
