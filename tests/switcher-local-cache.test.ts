import { assertEquals, assertFalse, spy, assertSpyCalls } from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import { Client, type Switcher, type SwitcherResult } from '../mod.ts';
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
    snapshotLocation, local: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
  });

  await Client.loadSnapshot();
  switcher = Client.getSwitcher();
});

Deno.test.afterAll(function() {
  Client.unloadSnapshot();
  TimedMatch.terminateWorker();
});

Deno.test.beforeEach(function() {
  Client.clearLogger();
  switcher = Client.getSwitcher();
});

Deno.test('should get response from cache', testSettings, async function () {
  // 1st call - should not get from cache
  let result = await switcher
    .throttle(1000)
    .detail()
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});

  // 2nd call - should get from cache
  result = await switcher
    .throttle(1000)
    .detail()
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, { cached: true });
});

Deno.test('should NOT get response from cache - different strategy input', testSettings, async function () {
  // 1st call - should not get from cache
  let result = await switcher
    .throttle(1000)
    .detail()
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});

  // 2nd call - should get from cache
  result = await switcher
    .throttle(1000)
    .detail()
    .checkValue('USA')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020');

  assertFalse((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});
});

Deno.test('should NOT get response from cache - different key', testSettings, async function () {
  // 1st call - should not get from cache
  let result = await switcher
    .throttle(1000)
    .detail()
    .isItOn('FF2FOR2021');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});

  // 2nd call - should get from cache
  result = await switcher
    .throttle(1000)
    .detail()
    .isItOn('FF2FOR2022');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});
});

Deno.test('should get response from cache when freeze mode is enabled', testSettings, async function () {
  // given
  Client.buildContext({ url, apiKey, domain, component, environment }, {
    snapshotLocation, local: true, freeze: true
  });
  
  await Client.loadSnapshot();

  // test
  switcher = Client.getSwitcher();
  const spyScheduleBackgroundRefresh = spy(switcher, 'scheduleBackgroundRefresh');

  // 1st call - should not get from cache
  let result = await switcher
    .throttle(1000)
    .detail()
    .isItOn('FF2FOR2021');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, {});

  // 2nd call - should get from cache
  result = await switcher
    .throttle(1000)
    .detail()
    .isItOn('FF2FOR2021');

  assertTrue((result as SwitcherResult).result);
  assertEquals((result as SwitcherResult).metadata || {}, { cached: true });

  assertSpyCalls(spyScheduleBackgroundRefresh, 0);
});