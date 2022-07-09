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

export class WaitSafe {
    static timelimit = 5000;
    static exit: boolean;

    static async wait() {
        WaitSafe.exit = false;
        
        const timelimit = Date.now() + WaitSafe.timelimit;
        let timer = Date.now();
        while (!WaitSafe.exit && timer < timelimit) {
            await new Promise(resolve => setTimeout(resolve, 100));
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