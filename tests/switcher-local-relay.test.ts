import { assertFalse } from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import { Client, type Switcher } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

let switcher: Switcher;
const apiKey = '[api_key]';
const domain = 'Business';
const component = 'business-service';
const environment = 'default';
const url = 'http://localhost:3000';
const snapshotLocation = './tests/snapshot/';

Deno.test.beforeAll(async function() {
  Client.buildContext({ url, apiKey, domain, component, environment }, {
    snapshotLocation, local: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
  });

  await Client.loadSnapshot();
});

Deno.test.afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

Deno.test.beforeEach(function() {
  Client.clearLogger();
});

Deno.test('should return false when Relay is enabled (restrict default: true)', testSettings, async function () {
  Client.buildContext({ domain, component, environment }, {
    snapshotLocation, local: true, logger: true
  });

  await Client.loadSnapshot();

  switcher = Client.getSwitcher();
  assertFalse(await switcher.isItOn('USECASE103'));
});

Deno.test('should return true when Relay is enabled (restrict: false)', testSettings, async function () {
  Client.buildContext({ domain, component, environment }, {
    snapshotLocation, local: true, logger: true, restrictRelay: false
  });

  await Client.loadSnapshot();

  switcher = Client.getSwitcher();
  assertTrue(await switcher.isItOn('USECASE103'));
});

Deno.test('should return true when Relay is disabled (restrict: true)', testSettings, async function () {
  Client.buildContext({ domain, component, environment }, {
    snapshotLocation, local: true, logger: true, restrictRelay: true
  });

  await Client.loadSnapshot();

  switcher = Client.getSwitcher();
  assertTrue(await switcher.isItOn('USECASE104'));
});