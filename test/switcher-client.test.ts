import { describe, it, afterAll, beforeEach, beforeAll } from 'https://deno.land/std@0.147.0/testing/bdd.ts';
import { assertEquals, assertRejects, assertFalse, assertExists } from 'https://deno.land/std@0.147.0/testing/asserts.ts';
import { assertTrue } from './helper/utils.ts'

import { StrategiesType } from '../src/lib/snapshot.ts';
import { 
  Switcher, 
  checkValue, 
  checkNetwork, 
  checkPayload
} from '../mod.ts';

describe('E2E test - Switcher offline:', function () {
  let switcher: Switcher;
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'default';
  const url = 'http://localhost:3000';

  beforeAll(async function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true, logger: true
    });

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();
  });

  afterAll(function() {
    Switcher.unloadSnapshot();
  });

  beforeEach(function() {
    Switcher.clearLogger();
    switcher = Switcher.factory();
  });

  it('Should be valid - isItOn', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);

    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('Should be valid - No prepare function needed', async function () {
    const result = await switcher.isItOn('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    assertTrue(result);
  });

  it('Should be valid - No prepare function needed (no input as well)', async function () {
    const result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
  });

  it('Should be valid - Switcher strategy disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2021', [checkNetwork('192.168.0.1')]);
    assertTrue(result);
  });

  it('Should be valid - No Switcher strategy', async function () {
    const result = await switcher.isItOn('FF2FOR2022');
    assertTrue(result);
  });

  it('Should be valid - JSON Payload matches all keys', async function () {
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

  it('Should be invalid - JSON Payload does NOT match all keys', async function () {
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

  it('Should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('192.168.0.2')
    ]);

    assertFalse(await switcher.isItOn());
    assertEquals(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' does not agree`);
  });

  it('Should be invalid - Input not provided', async function () {
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    assertEquals(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
  });

  it('Should be invalid - Switcher config disabled', async function () {
    assertFalse(await switcher.isItOn('FF2FOR2031'));
    assertEquals(Switcher.getLogger('FF2FOR2031')[0].response.reason, 
      'Config disabled');
  });

  it('Should be invalid - Switcher group disabled', async function () {
    assertFalse(await switcher.isItOn('FF2FOR2040'));
    assertEquals(Switcher.getLogger('FF2FOR2040')[0].response.reason, 
      'Group disabled');
  });

  it('Should be valid assuming key to be false and then forgetting it', async function () {
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

  it('Should be valid assuming unknown key to be true', async function () {
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

  it('Should enable test mode which will prevent a snapshot to be watchable', async function () {
    //given
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true, logger: true
    });

    switcher = Switcher.factory();
    
    //test
    Switcher.assume('FF2FOR2020').false();
    assertFalse(await switcher.isItOn('FF2FOR2020'));
    Switcher.assume('FF2FOR2020').true();
    assertTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('Should be invalid - Offline mode cannot load snapshot from an invalid path', async function () {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true,
      snapshotLocation: '//somewhere/'
    });

    Switcher.setTestEnabled();
    await assertRejects(async () =>
      await Switcher.loadSnapshot(), 
      Error, 'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('Should be valid - Offline mode', async function () {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true,
      snapshotLocation: 'generated-snapshots/'
    });

    await Switcher.loadSnapshot();
    assertExists(Switcher.snapshot)
  });
});