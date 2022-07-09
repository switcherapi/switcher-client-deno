// deno-lint-ignore-file no-explicit-any
import * as mf from "https://deno.land/x/mock_fetch@0.2.0/mod.ts";

export function given(route: string, expect: any) {
    mf.mock(route, (_req, _match) => {
        return new Response(JSON.stringify(expect), {
          status: 200,
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

class HttpError {
    errno: string;
    constructor(errno: string) {
        this.errno = errno;
    }
}