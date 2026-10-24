import { assertFalse } from "../deps.ts";
import { assertTrue } from '../helper/utils.ts';
import TimedMatch from "../../src/lib/utils/timed-match/index.ts";

const { test } = Deno;
const { beforeAll, beforeEach, afterAll } = test;

const okRE = "[a-z]";
const okInput = "a";
const nokRE = "^(([a-z])+.)+[A-Z]([a-z])+$";
const nokInput = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const COLD_TIME = 900;
const WARM_TIME = 150;
const TIMEOUT = 900; // margin for worker thread to finish

// TimedMatch.setMaxTimeLimit has no getter; track the value tests intend to
// use so warmUpWorker() can restore it after temporarily raising it.
let intendedMaxTimeLimit = 1000;
const setMaxTimeLimit = (value: number) => {
    intendedMaxTimeLimit = value;
    TimedMatch.setMaxTimeLimit(value);
};

// A freshly (re)created worker pays a one-time JIT/module-instrumentation
// cost on its FIRST real regex dispatch (much larger under `deno test
// --coverage`, which also instruments the worker module). Calls after that
// on the same worker are fast (see the warm loop below). Issue a cheap
// throwaway match right after the worker is (re)created so that cost is
// paid during warm-up instead of during a timing-sensitive assertion.
//
// The warm-up dispatch itself must not be allowed to exceed the *current*
// maxTimeLimit: doing so would make TimedMatch treat the warm-up call as a
// timeout, recreate the worker again, and add an entry to the blacklist -
// potentially evicting the entry a test just set up (maxBlackListed is set
// to 1 in several tests). Temporarily raise the limit for the warm-up call
// only, then restore whatever the test currently expects.
const warmUpWorker = () => {
    TimedMatch.setMaxTimeLimit(5000);
    TimedMatch.tryMatch([okRE], okInput);
    TimedMatch.setMaxTimeLimit(intendedMaxTimeLimit);
};

const getTimer = (timer: number) => (timer - Date.now()) * -1;

beforeAll(() => {
    TimedMatch.initializeWorker();
});

beforeEach(() => {
    TimedMatch.clearBlackList();
    TimedMatch.setMaxBlackListed(50);
    setMaxTimeLimit(1000);
    warmUpWorker();
});

afterAll(() => {
    TimedMatch.terminateWorker();
});

test("should return true", function () {
    const result = TimedMatch.tryMatch([okRE], okInput);
    assertTrue(result);
});

test('should return false and abort processing', function () {
    const result = TimedMatch.tryMatch([nokRE], nokInput);
    assertFalse(result);
});

test('runs stress tests', function () {
    let timer;

    timer = Date.now();
    TimedMatch.tryMatch([okRE], okInput);
    assertTrue(getTimer(timer) < COLD_TIME);

    timer = Date.now();
    TimedMatch.tryMatch([nokRE], nokInput);
    assertTrue(getTimer(timer) > TIMEOUT);
    warmUpWorker();

    timer = Date.now();
    TimedMatch.tryMatch([okRE], okInput);
    assertTrue(getTimer(timer) < COLD_TIME);

    for (let index = 0; index < 10; index++) {
        timer = Date.now();
        TimedMatch.tryMatch([okRE], okInput);
        assertTrue(getTimer(timer) < WARM_TIME);
    }
});

test('should rotate blacklist', function () {
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

test('should capture blacklisted item from multiple regex options', function () {
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

test('should capture blacklisted item from similar inputs', function () {
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

test('should reduce worker timer', function () {
    TimedMatch.setMaxTimeLimit(500);

    let timer = Date.now();
    TimedMatch.tryMatch([nokRE], nokInput);
    timer = getTimer(timer);
    assertTrue(timer > 450);
    assertTrue(timer < TIMEOUT);
});