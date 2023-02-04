// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "https://deno.land/std@0.176.0/testing/asserts.ts";
import * as mf from 'https://deno.land/x/mock_fetch@0.3.0/mod.ts';

export function given(route: string, expect: any, status = 200) {
  mf.mock(route, (_req, _match) => {
    return new Response(JSON.stringify(expect), {
      status,
    });
  });
}

export function givenError(route: string, expect: any) {
  mf.mock(route, () => {
    throw new HttpError(expect);
  });
}

export function tearDown() {
  mf.uninstall();
  mf.install();
}

export function assertTrue(value: any) {
  assertEquals(value, true);
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

export function generateStatus(status: boolean) {
  return {
    status,
  };
}

export class WaitSafe {
  static timelimit = 5000;
  static exit: boolean;

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
