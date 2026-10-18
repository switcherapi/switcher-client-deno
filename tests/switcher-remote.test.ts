import {
  assertEquals, assertRejects, assertFalse, 
  assertSpyCalls, assertStrictEquals, assertNotStrictEquals, spy, mf } from './deps.ts';
import { given, tearDown, assertTrue, generateAuth, generateResult, generateDetailedResult, sleep } from './helper/utils.ts'

import { Client, type SwitcherResult, type SwitcherContext } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import ExecutionLogger from '../src/lib/utils/executionLogger.ts';

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

Deno.test.beforeEach(function() {
  Client.testMode();

  contextSettings = { 
    url: 'http://localhost:3000',
    apiKey: '[apiKey]', 
    domain: '[domain]', 
    component: '[component]', 
    environment: 'default' 
  };

  mockFetch = mf.install();
  ExecutionLogger.clearLogger();
});

Deno.test.afterEach(function() {
  tearDown(mockFetch.restore);
});

Deno.test.afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

Deno.test('should be valid (simple)', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(true));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await switcher.prepare('FLAG_1');
  assertTrue(await switcher.isItOn());
});

Deno.test('should be valid - using persisted switcher key', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(true));

  // test
  Client.buildContext(contextSettings);
  
  // Get switcher multiple times with the same key
  const switcher1 = Client.getSwitcher('MY_PERSISTED_SWITCHER_KEY');
  const switcher2 = Client.getSwitcher('MY_PERSISTED_SWITCHER_KEY');
  const differentSwitcher = Client.getSwitcher('DIFFERENT_KEY');

  // Verify they are the same instance (persisted)
  assertStrictEquals(switcher1, switcher2, 'Switcher instances should be the same (persisted)');
  assertNotStrictEquals(switcher1, differentSwitcher, 'Different keys should create different instances');
  assertTrue(await switcher1.isItOn());
});

Deno.test('should NOT throw error when default result is provided using remote', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', { message: 'ERROR' }, 404);

  // test
  let asyncErrorMessage = null;
  Client.buildContext(contextSettings);
  Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);
  const switcher = Client.getSwitcher().defaultResult(true);

  assertTrue(await switcher.isItOn('UNKNOWN_FEATURE'));
  assertEquals(asyncErrorMessage, 'Something went wrong: [checkCriteria] failed with status 404');
});

Deno.test('should NOT be valid - API returned 429 (too many requests)', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', undefined, 429);

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await assertRejects(async () =>
    await switcher.isItOn('FLAG_1'),
    Error, 'Something went wrong: [auth] failed with status 429');
});

Deno.test('should return true - including reason and metadata', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateDetailedResult({
    result: true, 
    reason: 'Success',
    metadata: { 
      user: 'user1',
    }
  }));

  // test
  Client.buildContext(contextSettings);

  const switcher = Client.getSwitcher();
  const detailedResult = await switcher.detail().isItOn('FF2FOR2030') as SwitcherResult;
  assertTrue(detailedResult.result);
  assertEquals(detailedResult.reason, 'Success');
  assertEquals(detailedResult.metadata, { user: 'user1' });
});

Deno.test('should be valid (with all strategies)', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(true));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await switcher
    .checkValue('User 1')
    .checkNumeric('1')
    .checkNetwork('192.168.0.1')
    .checkDate('2019-12-01T08:30')
    .checkTime('08:00')
    .checkRegex(String.raw`\bUSER_[0-9]{1,2}\b`)
    .checkPayload(JSON.stringify({ name: 'User 1' }))
    .prepare('SWITCHER_MULTIPLE_INPUT');

  assertEquals(switcher.input, [
    [ 'VALUE_VALIDATION', 'User 1' ],
    [ 'NUMERIC_VALIDATION', '1' ],
    [ 'NETWORK_VALIDATION', '192.168.0.1' ],  
    [ 'DATE_VALIDATION', '2019-12-01T08:30' ],
    [ 'TIME_VALIDATION', '08:00' ],
    [ 'REGEX_VALIDATION', String.raw`\bUSER_[0-9]{1,2}\b` ],
    [ 'PAYLOAD_VALIDATION', '{"name":"User 1"}' ]
  ]);

  assertTrue(await switcher.isItOn());
});

Deno.test('should NOT throw when switcher keys provided were configured properly were configured properly', async function() {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria/switchers_check', { not_found: [] });

  // test
  Client.buildContext(contextSettings);

  let error: Error | undefined;
  await Client.checkSwitchers(['FEATURE01', 'FEATURE02']).catch(err => error = err);
  assertEquals(error, undefined);
});

Deno.test('should throw when switcher keys provided were not configured properly', async function() {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria/switchers_check', { not_found: ['FEATURE02'] });

  // test
  Client.buildContext(contextSettings);
  await assertRejects(async () =>
    await Client.checkSwitchers(['FEATURE01', 'FEATURE02']),
    Error, 'Something went wrong: [FEATURE02] not found');
});

Deno.test('should throw when no switcher keys were provided', async function() {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria/switchers_check', undefined, 422);

  // test
  Client.buildContext(contextSettings);
  await assertRejects(async () =>
    await Client.checkSwitchers([]),
    Error, 'Something went wrong: [checkSwitchers] failed with status 422');
});

Deno.test('should renew the token after expiration', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 1));

  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  const spyPrepare = spy(switcher, 'prepare');

  // Prepare the call generating the token
  given(mockFetch.instance, 'POST /criteria', generateResult(true));
  await switcher.prepare('MY_FLAG');
  assertTrue(await switcher.isItOn());

  // The program delay 2 secs later for the next call
  await sleep(2000);

  // Prepare the stub to provide the new token
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('asdad12d2232d2323f', 1));

  // In this time period the expiration time has reached, it should call prepare once again to renew the token
  given(mockFetch.instance, 'POST /criteria', generateResult(false));
  assertFalse(await switcher.isItOn());
  assertSpyCalls(spyPrepare, 2);

  // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
  given(mockFetch.instance, 'POST /criteria', generateResult(false));
  assertFalse(await switcher.isItOn());
  assertSpyCalls(spyPrepare, 2);
});

Deno.test('should be valid - when sending key without calling prepare', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(true));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  assertTrue(await switcher
    .checkValue('User 1')
    .checkNetwork('192.168.0.1')
    .isItOn('MY_FLAG'));
});

Deno.test('should be valid - when preparing key and sending input strategy afterwards', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(true));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();

  await switcher.prepare('MY_FLAG');
  assertTrue(await switcher
    .checkValue('User 1')
    .checkNetwork('192.168.0.1')
    .isItOn());
});