import { describe, it, afterAll, beforeEach, beforeAll,
  assertEquals, assertRejects, assertFalse } from './deps.ts';
import { assertTrue } from './helper/utils.ts'

import { Client, type Switcher, type SwitcherResult } from '../mod.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import { StrategiesType } from '../src/lib/snapshot.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

let switcher: Switcher;
const apiKey = '[api_key]';
const domain = 'Business';
const component = 'business-service';
const environment = 'default';
const url = 'http://localhost:3000';
const snapshotLocation = './tests/snapshot/';

describe('E2E test - Client testing (stub) feature:', function () {
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
    Client.forget('FF2FOR2020');
    switcher = Client.getSwitcher();
  });

  it('should replace the result of isItOn with Client.assume', testSettings, async function () {
    await switcher.prepare('DUMMY');

    Client.assume('DUMMY').true();
    assertTrue(await switcher.isItOn());

    Client.assume('DUMMY').false();
    assertFalse(await switcher.isItOn());
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
    const { result, reason } = await switcher.detail().isItOn('FF2FOR2020') as SwitcherResult;

    assertFalse(result);
    assertEquals(reason, 'Forced to false');
  });

  it('should be valid assuming key to be false - with metadata', async function () {
    Client.assume('FF2FOR2020').false().withMetadata({ value: 'something' });
    const { result, reason, metadata } = await switcher.detail(true).isItOn('FF2FOR2020') as SwitcherResult;

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

  it('should return true using Client.assume only when Strategy input values match', testSettings, async function () {
    await switcher
      .checkValue('Canada') // result to be false
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');
    
    assertFalse(await switcher.isItOn());
    Client.assume('FF2FOR2020').true()
      .when(StrategiesType.VALUE, 'Canada') // manipulate the condition to result to true
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
