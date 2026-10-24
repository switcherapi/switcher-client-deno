import { assertEquals, assertFalse } from './deps.ts';

import { Client, type Switcher } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';

const { test } = Deno;
const { beforeAll, afterAll } = test;
const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

let switcher: Switcher;
const apiKey = '[api_key]';
const domain = 'Business';
const component = 'business-service';
const url = 'http://localhost:3000';
const snapshotLocation = './tests/snapshot/';

beforeAll(async function() {
  Client.buildContext({ url, apiKey, domain, component, environment: 'default_disabled' }, {
    snapshotLocation, local: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
  });

  await Client.loadSnapshot();
  switcher = Client.getSwitcher();
});

afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

test('should be invalid - Client domain disabled', testSettings, async function () {
  assertFalse(await switcher.isItOn('FF2FOR2040'));
  assertEquals(Client.getLogger('FF2FOR2040')[0].response.reason, 
    'Domain disabled');
});