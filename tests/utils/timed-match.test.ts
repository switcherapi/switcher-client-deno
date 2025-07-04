import { afterAll, beforeAll, beforeEach, describe, it, assertFalse } from "../deps.ts";
import { assertTrue } from '../helper/utils.ts';
import TimedMatch from "../../src/lib/utils/timed-match/index.ts";

const okRE = "[a-z]";
const okInput = "a";
const nokRE = "^(([a-z])+.)+[A-Z]([a-z])+$";
const nokInput = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const COLD_TIME = 500;
const WARM_TIME = 50;
const TIMEOUT = 950; // 50ms margin for worker thread to finish

const getTimer = (timer: number) => (timer - Date.now()) * -1;

describe("Timed-Match tests:", function () {
    beforeAll(() => {
        TimedMatch.initializeWorker();
    });

    beforeEach(() => {
        TimedMatch.clearBlackList();
        TimedMatch.setMaxBlackListed(50);
        TimedMatch.setMaxTimeLimit(1000);
    });
    
    afterAll(() => {
        TimedMatch.terminateWorker();
    });

    it("should return true", function () {
        const result = TimedMatch.tryMatch([okRE], okInput);
        assertTrue(result);
    });

    it('should return false and abort processing', function () {
        const result = TimedMatch.tryMatch([nokRE], nokInput);
        assertFalse(result);
    });

    it('runs stress tests', function () {
        let timer;

        timer = Date.now();
        TimedMatch.tryMatch([okRE], okInput);
        assertTrue(getTimer(timer) < COLD_TIME);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assertTrue(getTimer(timer) > TIMEOUT);

        timer = Date.now();
        TimedMatch.tryMatch([okRE], okInput);
        assertTrue(getTimer(timer) < COLD_TIME);

        for (let index = 0; index < 10; index++) {
            timer = Date.now();
            TimedMatch.tryMatch([okRE], okInput);
            assertTrue(getTimer(timer) < WARM_TIME);
        }
    });

    it('should rotate blacklist', function () {
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assertTrue(getTimer(timer) > TIMEOUT);

        // blacklisted
        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assertTrue(getTimer(timer) < WARM_TIME);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assertTrue(getTimer(timer) > TIMEOUT);

        // blacklisted
        timer = Date.now();
        TimedMatch.tryMatch([nokRE], 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assertTrue(getTimer(timer) < WARM_TIME);
    });

    it('should capture blacklisted item from multiple regex options', function () {
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], nokInput);
        assertTrue(getTimer(timer) > TIMEOUT);

        // blacklisted (inverted regex order should still work)
        timer = Date.now();
        TimedMatch.tryMatch([okRE, nokRE], nokInput);
        assertTrue(getTimer(timer) < WARM_TIME);
    });

    it('should capture blacklisted item from similar inputs', function () {
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assertTrue(getTimer(timer) > TIMEOUT);

        // blacklisted (input slightly different but contains the same evil segment)
        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab');
        assertTrue(getTimer(timer) < WARM_TIME);

        // same here
        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assertTrue(getTimer(timer) < WARM_TIME);

        // and here with inverted regex
        timer = Date.now();
        TimedMatch.tryMatch([okRE, nokRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaa');
        assertTrue(getTimer(timer) < WARM_TIME);
    });

    it('should reduce worker timer', function () {
        TimedMatch.setMaxTimeLimit(500);

        let timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        timer = getTimer(timer);
        assertTrue(timer > 450);
        assertTrue(timer < TIMEOUT);
    });
});
