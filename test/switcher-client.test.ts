import { describe, it, afterAll, beforeEach, beforeAll, delay,
  assertEquals, assertRejects, assertFalse, assertExists } from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import type { ResultDetail } from "../src/types/index.d.ts";
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import { StrategiesType } from '../src/lib/snapshot.ts';
import { Client, type Switcher } from '../mod.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

let switcher: Switcher;
const apiKey = '[api_key]';
const domain = 'Business';
const component = 'business-service';
const environment = 'default';
const url = 'http://localhost:3000';
const snapshotLocation = './test/snapshot/';

describe('E2E test - Client local:', function () {
  beforeAll(async function() {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation, local: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
    });

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

  afterAll(function() {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  beforeEach(function() {
    Client.clearLogger();
    switcher = Client.getSwitcher();
  });

  it('should be valid - isItOn', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2021')

    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('should get execution from logger', async function () {
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

  it('should be valid - isItOn - with detail', testSettings, async function () {
    const response = await switcher.detail()
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020') as ResultDetail;

    assertTrue(response.result);
    assertEquals(response.reason, 'Success');
  });

  it('should be valid - No prepare function needed', testSettings, async function () {
    const result = await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');
    
    assertTrue(result);
  });

  it('should be valid - No prepare function needed (no input as well)', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
  });

  it('should be valid - Client strategy disabled', testSettings, async function () {
    const result = await switcher.checkNetwork('192.168.0.1').isItOn('FF2FOR2021');
    assertTrue(result);
  });

  it('should be valid - No Client strategy', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2022');
    assertTrue(result);
  });

  it('should be valid - JSON Payload matches all keys', testSettings, async function () {
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

  it('should be invalid - REGEX failed to perform in time', testSettings, async function () {
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

  it('should be invalid - JSON Payload does NOT match all keys', testSettings, async function () {
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

  it('should be invalid - Input (IP) does not match', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('192.168.0.2')  
      .prepare('FF2FOR2020');

    assertFalse(await switcher.isItOn());
    assertEquals(Client.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' does not agree`);
  });

  it('should be invalid - Input not provided', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    assertEquals(Client.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
  });

  it('should be invalid - Client config disabled', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2031'));
    assertEquals(Client.getLogger('FF2FOR2031')[0].response.reason, 
      'Config disabled');
  });

  it('should be invalid - Client group disabled', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2040'));
    assertEquals(Client.getLogger('FF2FOR2040')[0].response.reason, 
      'Group disabled');
  });

  it('should be valid - Local mode', testSettings, async function () {
    await delay(2000);
    
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true,
      regexSafe: false,
      snapshotLocation: 'generated-snapshots/'
    });
    
    const version = await Client.loadSnapshot();
    assertEquals(version, 0);
    assertExists(Client.snapshot);
  });

  it('should be invalid - Local mode cannot load snapshot from an invalid path', testSettings, async function () {
    await delay(2000);

    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true,
      regexSafe: false,
      snapshotLocation: '//somewhere/'
    });

    Client.testMode();
    
    //test
    await assertRejects(async () =>
      await Client.loadSnapshot(), 
      Error, 'Something went wrong: It was not possible to load the file at //somewhere/');

    //or
    let error: Error | undefined;
    await Client.loadSnapshot().catch((e) => error = e);
    assertEquals(error?.message, 'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('should not throw error when a default result is provided', testSettings, async function () {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true
    });

    const switcher = Client.getSwitcher('UNKNOWN_FEATURE').defaultResult(true);
    assertTrue(await switcher.isItOn());
  });

});

describe('E2E test - Client testing (assume) feature:', function () {
  beforeAll(async function() {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation, local: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
    });

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

  afterAll(function() {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  beforeEach(function() {
    Client.clearLogger();
    switcher = Client.getSwitcher();
  });

  it('should be valid assuming key to be false and then forgetting it', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');
    
    assertTrue(await switcher.isItOn());
    Client.assume('FF2FOR2020').false();
    assertFalse(await switcher.isItOn());
    
    Client.forget('FF2FOR2020');
    assertTrue(await switcher.isItOn());
  });

  it('should be valid assuming key to be false - with details', async function () {
    Client.assume('FF2FOR2020').false();
    const { result, reason } = await switcher.detail().isItOn('FF2FOR2020') as ResultDetail;

    assertFalse(result);
    assertEquals(reason, 'Forced to false');
  });

  it('should be valid assuming key to be false - with metadata', async function () {
    Client.assume('FF2FOR2020').false().withMetadata({ value: 'something' });
    const { result, reason, metadata } = await switcher.detail(true).isItOn('FF2FOR2020') as ResultDetail;

    assertFalse(result);
    assertEquals(reason, 'Forced to false');
    assertEquals(metadata, { value: 'something' });
  });

  it('should be valid assuming unknown key to be true and throw error when forgetting', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')  
      .prepare('UNKNOWN');
    
    Client.assume('UNKNOWN').true();
    assertTrue(await switcher.isItOn());

    Client.forget('UNKNOWN');
    await assertRejects(async () =>
      await switcher.isItOn(), 
      Error, 'Something went wrong: {"error":"Unable to load a key UNKNOWN"}');
  });

  it('should enable test mode which will prevent a snapshot to be watchable', testSettings, async function () {
    //given
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true, logger: true, regexSafe: false
    });

    switcher = Client.getSwitcher();
    
    //test
    Client.assume('FF2FOR2020').false();
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    Client.assume('FF2FOR2020').true();
    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('should return true using Client.assume only when Strategy input values match', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');
    
    assertTrue(await switcher.isItOn());
    Client.assume('FF2FOR2020').true()
      .when(StrategiesType.VALUE, 'Japan')
      .and(StrategiesType.NETWORK, '10.0.0.3');
      
    assertTrue(await switcher.isItOn());
  });

  it('should NOT return true using Client.assume when Strategy input values does not match', testSettings, async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');
    
    assertTrue(await switcher.isItOn());
    Client.assume('FF2FOR2020').true()
      .when(StrategiesType.VALUE, ['Brazil', 'Japan'])
      .and(StrategiesType.NETWORK, ['10.0.0.4', '192.168.0.1']);
      
    assertFalse(await switcher.isItOn());
  });

});