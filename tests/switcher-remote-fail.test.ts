import { assertRejects, mf } from './deps.ts';
import { given, tearDown, generateAuth } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

Deno.test.beforeEach(function() {
  mockFetch = mf.install();
  Client.testMode();

  contextSettings = { 
    url: 'http://localhost:3000',
    apiKey: '[apiKey]', 
    domain: '[domain]', 
    component: '[component]', 
    environment: 'default' 
  };
});

Deno.test.afterEach(function() {
  tearDown(mockFetch.restore);
});

Deno.test.afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

Deno.test('should NOT be valid - API returned 429 (too many requests) at auth', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', { error: 'Too many requests' }, 429);

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await assertRejects(async () =>
    await switcher.isItOn('FLAG_1'),
    Error, 'Something went wrong: [auth] failed with status 429');
});

Deno.test('should NOT be valid - API returned 429 (too many requests) at checkCriteria', async function () {
  // given API responses
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));
  given(mockFetch.instance, 'POST /criteria', { error: 'Too many requests' }, 429);

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await assertRejects(async () =>
    await switcher.isItOn('FLAG_1'),
    Error, 'Something went wrong: [checkCriteria] failed with status 429');
});