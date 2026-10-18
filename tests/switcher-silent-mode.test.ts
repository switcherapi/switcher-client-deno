import {
  assertEquals, assertRejects, assertFalse, 
  assertSpyCalls, spy, mf } from './deps.ts';
import { given, givenError, tearDown, assertTrue, generateAuth, generateResult, sleep } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import ExecutionLogger from '../src/lib/utils/executionLogger.ts';

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

Deno.test.afterAll(function() {
  Client.unloadSnapshot();
});

Deno.test.afterEach(function() {
  tearDown(mockFetch.restore);
});

Deno.test.beforeEach(function() {
  mockFetch = mf.install();
  ExecutionLogger.clearLogger();
  Client.testMode();

  contextSettings = { 
    url: 'http://localhost:3000',
    apiKey: '[apiKey]', 
    domain: '[domain]', 
    component: '[component]', 
    environment: 'default' 
  };
});

Deno.test('should run in silent mode', async function () {
  // setup context to read the snapshot in case the API does not respond
  Client.buildContext(contextSettings, {
    snapshotLocation: './tests/snapshot/',
    regexSafe: false,
    silentMode: '2s',
  });
  
  const switcher = Client.getSwitcher();
  const spyRemote = spy(switcher, 'executeRemoteCriteria');

  // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
  givenError(mockFetch.instance, 'POST /criteria/auth', 'ECONNREFUSED');
  assertTrue(await switcher.isItOn('FF2FOR2030'));

  // The call below is in silent mode. It is getting the configuration from the local snapshot again
  await sleep(500);
  assertTrue(await switcher.isItOn());

  // As the silent mode was configured to retry after 2 seconds, it's still in time, 
  // therefore, remote call was not yet invoked
  assertSpyCalls(spyRemote, 0);
  await sleep(3000);
  
  // Setup the remote mocked response and made it to return false just to make sure it's not fetching from the snapshot
  given(mockFetch.instance, 'GET /check', undefined, 200);
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 10));
  given(mockFetch.instance, 'POST /criteria', generateResult(false));

  // Auth is async when silent mode is enabled to prevent blocking the execution while the API is not available
  assertTrue(await switcher.isItOn());

  // Now the remote call was invoked, so it should return false
  await sleep(500);
  assertFalse(await switcher.isItOn());
  assertSpyCalls(spyRemote, 1);
});

Deno.test('should throw error if not in silent mode', async function () {
  givenError(mockFetch.instance, 'POST /criteria/auth', 'ECONNREFUSED');

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();

  await assertRejects(async () =>
    await switcher.isItOn('FF2FOR2030'),
    Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
});

Deno.test('should run in silent mode when API is unavailable', async function () {
  Client.buildContext(contextSettings, {
    snapshotLocation: './tests/snapshot/',
    regexSafe: false,
    silentMode: '5m'
  });

  const switcher = Client.getSwitcher();
  assertTrue(await switcher.isItOn('FF2FOR2030'));
});

Deno.test('should use silent mode when fail to check switchers', async function() {
  Client.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './tests/snapshot/' });
  await assertRejects(async () =>
    await Client.checkSwitchers(['FEATURE01', 'FEATURE02']),
    Error, 'Something went wrong: [FEATURE01,FEATURE02] not found');

  await Client.checkSwitchers(['FF2FOR2021', 'FF2FOR2021']);
});

Deno.test('should use silent mode when fail to check criteria', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', { error: 'Too many requests' }, 429);
  givenError(mockFetch.instance, 'GET /check', 'ECONNREFUSED'); // used in the 2nd isItOn call

  // test
  let asyncErrorMessage = null;
  Client.buildContext(contextSettings, { silentMode: '1s', regexSafe: false, snapshotLocation: './tests/snapshot/' });
  Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);

  const switcher = Client.getSwitcher();
  
  // assert silent mode being used while registering the error
  assertTrue(await switcher.isItOn('FF2FOR2022'));
  assertEquals(asyncErrorMessage, 'Something went wrong: [checkCriteria] failed with status 429');

  // assert silent mode being used in the next call
  await sleep(1500);
  assertTrue(await switcher.isItOn('FF2FOR2022'));
});