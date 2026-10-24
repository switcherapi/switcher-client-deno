import { assertEquals, assertSpyCalls, spy, mf } from './deps.ts';
import { given, tearDown, generateAuth, sleep } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import { Auth } from "../src/lib/remoteAuth.ts";
import { GlobalAuth } from "../src/lib/globals/globalAuth.ts";
import TimedMatch from '../src/lib/utils/timed-match/index.ts';

const { test } = Deno;
const { beforeEach, afterEach, afterAll } = test;

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

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
  Auth.terminateAutoRefresh();
});

afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

test('should refresh the token before it expires in the background', async function () {
  // given API responses - 1st auth call
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token_1]', 5));
  
  // test
  Client.buildContext(contextSettings, { autoRefreshToken: true });
  await Client.getSwitcher('FLAG_1').prepare();

  // given API responses - 2nd auth call (after token expiration)
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token_2]', 5));

  assertEquals(GlobalAuth.token, '[auth_token_1]');
  await sleep(1000);
  assertEquals(GlobalAuth.token, '[auth_token_2]');
});

test('should not refresh the token if autoRefreshToken is false', async function () {
  // given API responses - 1st auth call
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token_1]', 1));
  
  // test
  Client.buildContext(contextSettings, { autoRefreshToken: false });
  await Client.getSwitcher('FLAG_1').prepare();

  // given API responses - 2nd auth call (after token expiration)
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token_2]', 5));

  assertEquals(GlobalAuth.token, '[auth_token_1]');
  await sleep(1500);
  assertEquals(GlobalAuth.token, '[auth_token_1]', 'Token should not have been refreshed');
});

test('should handle token refresh failure gracefully', async function () {
  const spyTerminate = spy(Auth, 'terminateAutoRefresh');

  // given API responses - 1st auth call
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token_1]', 1));
  
  // test
  Client.buildContext(contextSettings, { autoRefreshToken: true });
  await Client.getSwitcher('FLAG_1').prepare();

  // given API responses - 2nd auth call (after token expiration) fails
  given(mockFetch.instance, 'POST /criteria/auth', undefined, 500);

  assertEquals(GlobalAuth.token, '[auth_token_1]');
  await sleep(1500);
  assertEquals(GlobalAuth.token, '[auth_token_1]', 'Token should not have been refreshed');
  assertSpyCalls(spyTerminate, 1);
});