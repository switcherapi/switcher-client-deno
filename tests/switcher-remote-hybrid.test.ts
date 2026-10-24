import {
  assertRejects, assertFalse, 
  assertSpyCalls, spy, mf } from './deps.ts';
import { given, tearDown, assertTrue, generateAuth, generateResult } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';

const { test } = Deno;
const { beforeEach, afterEach, afterAll } = test;

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

const forceRemoteOptions = { 
  local: true, 
  snapshotLocation: './tests/snapshot/',
  regexSafe: false
};

beforeEach(function() {
  Client.testMode();

  contextSettings = { 
    url: 'http://localhost:3000',
    apiKey: '[apiKey]', 
    domain: '[domain]', 
    component: '[component]', 
    environment: 'default' 
  };
  
  mockFetch = mf.install();
});

afterEach(function() {
  tearDown(mockFetch.restore);
});

afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

test('should return false - same switcher return false when remote', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', generateResult(false));

  // test
  Client.buildContext(contextSettings, forceRemoteOptions);

  const switcher = Client.getSwitcher();
  const executeRemoteCriteria = spy(switcher, 'executeRemoteCriteria');
  
  await Client.loadSnapshot();
  assertTrue(await switcher.isItOn('FF2FOR2030'));  // snapshot value is true
  assertFalse(await switcher.remote().isItOn('FF2FOR2030')); // remote value is false
  assertSpyCalls(executeRemoteCriteria, 1);
});

test('should return error when local is not enabled', async function () {
  Client.buildContext(contextSettings, { regexSafe: false, local: false });

  const switcher = Client.getSwitcher();
  
  await assertRejects(async () =>
    await switcher.remote().isItOn('FF2FOR2030'),
    Error, 'Local mode is not enabled');
});