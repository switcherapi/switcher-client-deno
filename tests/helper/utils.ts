import { assertEquals, type mf } from '../deps.ts';

export function given(instance: mf.FetchMock, route: mf.RouteString, expect: object | undefined, status = 200) {
  instance.mock(route, new Response(JSON.stringify(expect), {
      status,
    }
  ));
}

export function givenError(instance: mf.FetchMock, route: mf.RouteString, expect: string) {
  instance.mock(route, () => {
    throw new HttpError(expect);
  });
}

export function tearDown(restore: () => void) {
  restore();
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
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (WaitSafe.exit || Date.now() >= timelimit) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
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
