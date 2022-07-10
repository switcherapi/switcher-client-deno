// deno-lint-ignore-file no-explicit-any
import { describe, it, afterAll, afterEach, beforeEach } from 'https://deno.land/std@0.147.0/testing/bdd.ts';
import { assertEquals, assertNotEquals, assertRejects, assertFalse } from 'https://deno.land/std@0.147.0/testing/asserts.ts';
import { assertSpyCalls, spy } from 'https://deno.land/std@0.147.0/testing/mock.ts';
import { given, givenError, tearDown, assertTrue, generateAuth, generateResult } from './helper/utils.ts'

import { 
  Switcher, 
  checkValue, 
  checkNetwork, 
  checkDate, 
  checkTime, 
  checkRegex, 
  checkNumeric, 
  checkPayload
} from '../mod.ts';

describe('Integrated test - Switcher:', function () {

  let contextSettings: any;

  afterAll(function() {
    Switcher.unloadSnapshot();
  });

  beforeEach(function() {
    tearDown();
    Switcher.setTestEnabled();

    contextSettings = { 
      url: 'http://localhost:3000',
      apiKey: '[apiKey]', 
      domain: '[domain]', 
      component: '[component]', 
      environment: 'default' 
    };
  });

  describe('check criteria (e2e):', function () {
  
    afterEach(function() {
      tearDown();
    });

    it('Should be valid', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1');
      assertTrue(await switcher.isItOn());
    });

    it('Should be valid - throttle', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      switcher.throttle(1000);

      const spyAsyncOnlineCriteria = spy(switcher, '_executeAsyncOnlineCriteria');
      let throttledRunTimer;
      for (let index = 0; index < 10; index++) {
        assertTrue(await switcher.isItOn('FLAG_1'));
        
        if (index === 0)
          // First run calls API
          assertEquals(0, switcher._nextRun);
        else {
          // Set up throttle for next API call 
          assertNotEquals(0, switcher._nextRun);
          throttledRunTimer = switcher._nextRun;
        }
      }

      assertSpyCalls(spyAsyncOnlineCriteria, 9);

      // Next call Should call the API again as the throttle has expired
      await new Promise(resolve => setTimeout(resolve, 2000));
      assertTrue(await switcher.isItOn('FLAG_1'));
      assertSpyCalls(spyAsyncOnlineCriteria, 10);

      // Throttle expired, set up new throttle run timer
      assertNotEquals(throttledRunTimer, switcher._nextRun);
    });
  });

  describe('check criteria:', function () {

    beforeEach(function() {
      tearDown();
    });


    it('Should be valid', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1', [
        checkValue('User 1'),
        checkNumeric('1'),
        checkNetwork('192.168.0.1'),
        checkDate('2019-12-01T08:30'),
        checkTime('08:00'),
        checkRegex('\\bUSER_[0-9]{1,2}\\b'),
        checkPayload(JSON.stringify({ name: 'User 1' }))
      ]);

      assertEquals(switcher._input, [
        [ 'VALUE_VALIDATION', 'User 1' ],
        [ 'NUMERIC_VALIDATION', '1' ],
        [ 'NETWORK_VALIDATION', '192.168.0.1' ],  
        [ 'DATE_VALIDATION', '2019-12-01T08:30' ],
        [ 'TIME_VALIDATION', '08:00' ],
        [ 'REGEX_VALIDATION', '\\bUSER_[0-9]{1,2}\\b' ],
        [ 'PAYLOAD_VALIDATION', '{"name":"User 1"}' ]
      ]);
      assertTrue(await switcher.isItOn());
    });

    it('Should not throw when switcher keys provided were configured properly', async function() {
      //given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', { not_found: [] });

      //test
      Switcher.buildContext(contextSettings);
      await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']);
    });

    it('Should throw when switcher keys provided were not configured properly', async function() {
      //given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', { not_found: ['FEATURE02'] });

      //test
      Switcher.buildContext(contextSettings);
      await assertRejects(async () =>
        await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']),
        Error, 'Something went wrong: Something went wrong: [FEATURE02] not found');
    });

    it('Should throw when no switcher keys were provided', async function() {
      //given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', { errors: [ { msg: 'Switcher Key is required' } ] }, 422);

      //test
      Switcher.buildContext(contextSettings);
      await assertRejects(async () =>
        await Switcher.checkSwitchers([]),
        Error, 'Something went wrong: Switcher Key is required');
    });
    
    it('Should renew the token after expiration', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 1));

      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      const spyPrepare = spy(switcher, 'prepare');

      // Prepare the call generating the token
      given('POST@/criteria', generateResult(true));
      await switcher.prepare('MY_FLAG');
      assertTrue(await switcher.isItOn());

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the stub to provide the new token
      given('POST@/criteria/auth', generateAuth('asdad12d2232d2323f', 1));

      // In this time period the expiration time has reached, it Should call prepare once again to renew the token
      given('POST@/criteria', generateResult(false));
      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 2);

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      given('POST@/criteria', generateResult(false));
      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 2);
    });

    it('Should be valid - when sending key without calling prepare', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      assertTrue(await switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('Should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responding properly
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG');
      assertTrue(await switcher.isItOn(undefined, [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('Should be invalid - Missing API Key field', async function () {
      // given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      Switcher.context.apiKey = undefined;
      const switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Missing API Key field');
    });

    it('Should be invalid - Missing key field', async function () {
      // given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Missing key field');
    });

    it('Should be invalid - Missing component field', async function () {
      // given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      Switcher.context.component = undefined;
      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn('MY_FLAG'),
        Error, 'Something went wrong: Missing component field');
    });

    it('Should be invalid - Missing token field', async function () {
      // given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth(undefined, 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.isItOn('MY_FLAG'),
        Error, 'Something went wrong: Missing token field');
    });

    it('Should be invalid - bad strategy input', async function () {
      // given
      given('GET@/check', null);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      await switcher.prepare('MY_WRONG_FLAG', [['THIS IS WRONG']]);

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Invalid input format for \'THIS IS WRONG\'');
    });

    it('Should run in silent mode', async function () {
      // setup context to read the snapshot in case the API does not respond
      Switcher.buildContext(contextSettings, {
        silentMode: true,
        retryAfter: '2s'
      });
      
      const switcher = Switcher.factory();
      const spyPrepare = spy(switcher, 'prepare');

      // First attempt to reach the API - Since it's configured to use silent mode, it Should return true (according to the snapshot)
      givenError('POST@/criteria/auth', 'ECONNREFUSED');
      assertTrue(await switcher.isItOn('FF2FOR2030'));

      await new Promise(resolve => setTimeout(resolve, 500));
      // The call below is in silent mode. It is getting the configuration from the offline snapshot again
      assertTrue(await switcher.isItOn());

      // As the silent mode was configured to retry after 2 seconds, it's still in time, 
      // therefore, prepare was never called
      assertSpyCalls(spyPrepare, 0);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Silent mode has expired. Again, the online API is still offline. Prepare still not be invoked

      assertTrue(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 0);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Setup the online mocked response and made it to return false just to make sure it's not fetching from the snapshot
      given('GET@/check', undefined, 200);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 10));
      given('POST@/criteria', generateResult(false));

      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 1);
    });

    it('Should throw error if not in silent mode', async function () {
      givenError('POST@/criteria/auth', 'ECONNREFUSED');

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn('FF2FOR2030'),
        Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
    });

    it('Should run in silent mode when API is unavailable', async function () {
      // given: API unavailable
      given('GET@/check', undefined, 503);

      // test
      Switcher.buildContext(contextSettings, {
        silentMode: true
      });

      const switcher = Switcher.factory();
      assertTrue(await switcher.isItOn('FF2FOR2030'));
    });

  });
});