import { describe, it, afterAll, beforeEach, beforeAll, delay,
  assertEquals, assertRejects, assertFalse, assertExists } from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import type { ResultDetail } from "../src/types/index.d.ts";
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import { StrategiesType } from '../src/lib/snapshot.ts';
import { 
  Switcher, 
  checkValue, 
  checkNetwork, 
  checkPayload,
  checkRegex
} from '../mod.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

describe('E2E test - Switcher local:', function () {
  let switcher: Switcher;
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'default';
  const url = 'http://localhost:3000';
  const snapshotLocation = './snapshot/';

  beforeAll(async function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation, local: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
    });

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();
  });

  afterAll(function() {
    Switcher.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  beforeEach(function() {
    Switcher.clearLogger();
    switcher = Switcher.factory();
  });

  it('should be valid - isItOn', testSettings, async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);

    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('should be valid - isItOn - with detail', testSettings, async function () {
    const response = await switcher.detail().isItOn('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]) as ResultDetail;

    assertTrue(response.result);
    assertEquals(response.reason, 'Success');
  });

  it('should be valid - No prepare function needed', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    assertTrue(result);
  });

  it('should be valid - No prepare function needed (no input as well)', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
  });

  it('should be valid - Switcher strategy disabled', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2021', [checkNetwork('192.168.0.1')]);
    assertTrue(result);
  });

  it('should be valid - No Switcher strategy', testSettings, async function () {
    const result = await switcher.isItOn('FF2FOR2022');
    assertTrue(result);
  });

  it('should be valid - JSON Payload matches all keys', testSettings, async function () {
    await switcher.prepare('FF2FOR2023', [
      checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN',
          role: 'ADMIN'
        }
      }))
    ]);

    const result = await switcher.isItOn();
    assertTrue(result);
  });

  it('should be invalid - REGEX failed to perform in time', testSettings, async function () {
    const getTimer = (timer: number) => (timer - Date.now()) * -1;

    let timer = Date.now();
    const result = await switcher.isItOn('FF2FOR2024', [checkRegex('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')]);
    timer = getTimer(timer);

    assertFalse(result);
    assertTrue(timer > 500);
    assertTrue(timer < 600);
  });

  it('should be invalid - JSON Payload does NOT match all keys', testSettings, async function () {
    await switcher.prepare('FF2FOR2023', [
      checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN'
        }
      }))
    ]);

    assertFalse(await switcher.isItOn());
    assertEquals(Switcher.getLogger('FF2FOR2023')[0].response.reason, 
      `Strategy '${StrategiesType.PAYLOAD}' does not agree`);
  });

  it('should be invalid - Input (IP) does not match', testSettings, async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('192.168.0.2')
    ]);

    assertFalse(await switcher.isItOn());
    assertEquals(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' does not agree`);
  });

  it('should be invalid - Input not provided', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    assertEquals(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
  });

  it('should be invalid - Switcher config disabled', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2031'));
    assertEquals(Switcher.getLogger('FF2FOR2031')[0].response.reason, 
      'Config disabled');
  });

  it('should be invalid - Switcher group disabled', testSettings, async function () {
    assertFalse(await switcher.isItOn('FF2FOR2040'));
    assertEquals(Switcher.getLogger('FF2FOR2040')[0].response.reason, 
      'Group disabled');
  });

  it('should be valid assuming key to be false and then forgetting it', testSettings, async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    assertTrue(await switcher.isItOn());
    Switcher.assume('FF2FOR2020').false();
    assertFalse(await switcher.isItOn());
    
    Switcher.forget('FF2FOR2020');
    assertTrue(await switcher.isItOn());
  });

  it('should be valid assuming key to be false - with details', async function () {
    Switcher.assume('FF2FOR2020').false();
    const { result, reason } = await switcher.detail().isItOn('FF2FOR2020', []) as ResultDetail;

    assertFalse(result);
    assertEquals(reason, 'Forced to false');
  });

  it('should be valid assuming key to be false - with metadata', async function () {
    Switcher.assume('FF2FOR2020').false().withMetadata({ value: 'something' });
    const { result, reason, metadata } = await switcher.detail(true).isItOn('FF2FOR2020', []) as ResultDetail;

    assertFalse(result);
    assertEquals(reason, 'Forced to false');
    assertEquals(metadata, { value: 'something' });
  });

  it('should be valid assuming unknown key to be true', testSettings, async function () {
    await switcher.prepare('UNKNOWN', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    Switcher.assume('UNKNOWN').true();
    assertTrue(await switcher.isItOn());

    Switcher.forget('UNKNOWN');
    await assertRejects(async () =>
      await switcher.isItOn(), 
      Error, 'Something went wrong: {"error":"Unable to load a key UNKNOWN"}');
  });

  it('should enable test mode which will prevent a snapshot to be watchable', testSettings, async function () {
    //given
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      local: true, logger: true, regexSafe: false
    });

    switcher = Switcher.factory();
    
    //test
    Switcher.assume('FF2FOR2020').false();
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    Switcher.assume('FF2FOR2020').true();
    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('should be valid - Local mode', testSettings, async function () {
    await delay(2000);
    
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      local: true,
      regexSafe: false,
      snapshotLocation: 'generated-snapshots/'
    });
    
    const version = await Switcher.loadSnapshot(false, false);
    assertEquals(version, 0);
    assertExists(Switcher.snapshot);
  });

  it('should be invalid - Local mode cannot load snapshot from an invalid path', testSettings, async function () {
    await delay(2000);

    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      local: true,
      regexSafe: false,
      snapshotLocation: '//somewhere/'
    });

    Switcher.testMode();
    
    //test
    await assertRejects(async () =>
      await Switcher.loadSnapshot(), 
      Error, 'Something went wrong: It was not possible to load the file at //somewhere/');

    //or
    let error: Error | undefined;
    await Switcher.loadSnapshot(false, false).catch((e) => error = e);
    assertEquals(error?.message, 'Something went wrong: It was not possible to load the file at //somewhere/');
  });

});