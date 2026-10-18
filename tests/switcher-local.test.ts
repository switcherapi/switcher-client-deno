import { delay, assertEquals, assertRejects, assertFalse, assertExists} from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import { Client, type Switcher, type SwitcherResult } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import { StrategiesType } from '../src/lib/snapshot.ts';
import { GlobalSnapshot } from '../src/lib/globals/globalSnapshot.ts';

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

Deno.test('should be valid - isItOn', testSettings, async function () {
  await switcher
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .prepare('FF2FOR2020');

  assertTrue(switcher.isItOn() === true);
  assertTrue(await switcher.isItOn() === true);
  assertTrue(switcher.isItOnBool() === true);
  assertTrue(await switcher.isItOnBool(true) === true);
  assertTrue(switcher.isItOnDetail().result === true);
  assertTrue((await switcher.isItOnDetail(true)).result === true);
});

Deno.test('should get execution from logger', async function () {
  await switcher
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .prepare('FF2FOR2020');

  await switcher.isItOn('FF2FOR2020');
  const log = Client.getExecution(switcher);

  assertEquals(log.key, 'FF2FOR2020');
  assertEquals(log.input, [
    [ 'VALUE_VALIDATION', 'Japan' ],
    [ 'NETWORK_VALIDATION', '10.0.0.3' ]]);
  assertEquals(log.response.reason, 'Success');
  assertEquals(log.response.result, true);
});

Deno.test('should be valid - isItOn - with detail', testSettings, async function () {
  const response = await switcher.detail()
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020') as SwitcherResult;

  assertTrue(response.result);
  assertEquals(response.reason, 'Success');
  assertEquals(response.toJSON(), {
    result: true,
    reason: 'Success',
    metadata: undefined
  });
});

Deno.test('should be valid - No prepare function needed', testSettings, async function () {
  const result = await switcher
    .checkValue('Japan')
    .checkNetwork('10.0.0.3')
    .isItOn('FF2FOR2020');
  
  assertTrue(result);
});

Deno.test('should be valid - No prepare function needed (no input as well)', testSettings, async function () {
  const result = await switcher.isItOn('FF2FOR2030');
  assertTrue(result);
});

Deno.test('should be valid - Client strategy disabled', testSettings, async function () {
  const result = await switcher.checkNetwork('192.168.0.1').isItOn('FF2FOR2021');
  assertTrue(result);
});

Deno.test('should be valid - No Client strategy', testSettings, async function () {
  const result = await switcher.isItOn('FF2FOR2022');
  assertTrue(result);
});

Deno.test('should be valid - JSON Payload matches all keys', testSettings, async function () {
  await switcher
    .checkPayload(JSON.stringify({
      id: 1,
      user: {
        login: 'USER_LOGIN',
        role: 'ADMIN'
      }
    }))
    .prepare('FF2FOR2023');

  const result = await switcher.isItOn();
  assertTrue(result);
});

Deno.test('should be invalid - REGEX failed to perform in time', testSettings, async function () {
  const getTimer = (timer: number) => (timer - Date.now()) * -1;

  let timer = Date.now();
  const result = await switcher
    .checkRegex('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    .isItOn('FF2FOR2024');

  timer = getTimer(timer);

  assertFalse(result);
  assertTrue(timer > 500);
  assertTrue(timer < 600);
});

Deno.test('should be invalid - JSON Payload does NOT match all keys', testSettings, async function () {
  await switcher
    .checkPayload(JSON.stringify({
      id: 1,
      user: {
        login: 'USER_LOGIN'
      }
    }))
    .prepare('FF2FOR2023');

  assertFalse(await switcher.isItOn());
  assertEquals(Client.getLogger('FF2FOR2023')[0].response.reason, 
    `Strategy '${StrategiesType.PAYLOAD}' does not agree`);
});

Deno.test('should be invalid - Input (IP) does not match', testSettings, async function () {
  await switcher
    .checkValue('Japan')
    .checkNetwork('192.168.0.2')  
    .prepare('FF2FOR2020');

  assertFalse(await switcher.isItOn());
  assertEquals(Client.getLogger('FF2FOR2020')[0].response.reason, 
    `Strategy '${StrategiesType.NETWORK}' does not agree`);
});

Deno.test('should be invalid - Input not provided', testSettings, async function () {
  assertFalse(await switcher.isItOn('FF2FOR2020'));
  assertEquals(Client.getLogger('FF2FOR2020')[0].response.reason, 
    `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
});

Deno.test('should be invalid - Client config disabled', testSettings, async function () {
  assertFalse(await switcher.isItOn('FF2FOR2031'));
  assertEquals(Client.getLogger('FF2FOR2031')[0].response.reason, 
    'Config disabled');
});

Deno.test('should be invalid - Client group disabled', testSettings, async function () {
  assertFalse(await switcher.isItOn('FF2FOR2040'));
  assertEquals(Client.getLogger('FF2FOR2040')[0].response.reason, 
    'Group disabled');
});

Deno.test('should clear strategy inputs', testSettings, async function () {
  // when
  await switcher
    .checkValue('Japan')
    .checkNetwork('10.0.0.2')  
    .prepare('FF2FOR2020');

  assertExists(switcher.input);
  assertTrue(await switcher.isItOn());

  // test
  switcher.resetInputs();
  assertEquals(switcher.input, undefined);
  assertFalse(await switcher.isItOn());  
});

Deno.test('should be valid - Local mode', testSettings, async function () {
  await delay(2000);
  
  Client.buildContext({ url, apiKey, domain, component, environment }, {
    local: true,
    regexSafe: false,
    snapshotLocation: 'generated-snapshots/'
  });
  
  const version = await Client.loadSnapshot();
  assertEquals(version, 0);
  assertExists(GlobalSnapshot.snapshot);
});

Deno.test('should be invalid - Local mode cannot load snapshot from an invalid path', testSettings, async function () {
  await delay(2000);

  Client.buildContext({ url, apiKey, domain, component, environment }, {
    local: true,
    regexSafe: false,
    snapshotLocation: '//<>/'
  });

  Client.testMode();
  
  // test
  await assertRejects(async () =>
    await Client.loadSnapshot(), 
    Error, 'Something went wrong: It was not possible to load the file at //<>/');

  //or
  let error: Error | undefined;
  await Client.loadSnapshot().catch((e) => error = e);
  assertEquals(error?.message, 'Something went wrong: It was not possible to load the file at //<>/');
});

Deno.test('should not throw error when a default result is provided', testSettings, async function () {
  Client.buildContext({ url, apiKey, domain, component, environment }, {
    local: true
  });

  const switcher = Client.getSwitcher('UNKNOWN_FEATURE').defaultResult(true);
  assertTrue(await switcher.isItOn());
});