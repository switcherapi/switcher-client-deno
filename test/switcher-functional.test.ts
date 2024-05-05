import { describe, it, afterAll, afterEach, beforeEach, 
  assertEquals, assertRejects, assertThrows, assertFalse, 
  assertSpyCalls, spy } from './deps.ts';
import { given, givenError, tearDown, assertTrue, generateAuth, generateResult, generateDetailedResult, sleep } from './helper/utils.ts'

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
import type { ResultDetail, SwitcherContext } from '../src/types/index.d.ts';
import TimedMatch from '../src/lib/utils/timed-match/index.ts';
import ExecutionLogger from "../src/lib/utils/executionLogger.ts";

describe('Integrated test - Switcher:', function () {

  let contextSettings: SwitcherContext;

  afterAll(function() {
    Switcher.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  beforeEach(function() {
    tearDown();
    Switcher.testMode();

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

    beforeEach(function() {
      ExecutionLogger.clearLogger();
    });

    it('should be valid', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1');
      assertTrue(await switcher.isItOn());
    });

    it('should NOT be valid - API returned 429 (too many requests)', async function () {
      // given API responding properly
      given('POST@/criteria/auth', undefined, 429);

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.isItOn('FLAG_1'),
        Error, 'Something went wrong: [auth] failed with status 429');
    });

    it('should be valid - throttle', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      switcher.throttle(1000);

      const spyPrepare = spy(switcher, '_executeAsyncRemoteCriteria');
      const spyExecutionLogger = spy(ExecutionLogger, 'add');

      assertTrue(await switcher.isItOn('FLAG_1')); // sync
      assertTrue(await switcher.isItOn('FLAG_1')); // async
      await sleep(100); // wait resolve async Promise

      assertSpyCalls(spyPrepare, 1);
      assertSpyCalls(spyExecutionLogger, 2); // 1st (sync) + 2nd (async)
    });
    
    it('should be valid - throttle - with details', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(true));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      switcher.throttle(1000);

      // first API call - stores result in cache
      await switcher.isItOn('FLAG_2');

      // first async API call
      const response = await switcher.detail().isItOn('FLAG_2') as ResultDetail;
      assertTrue(response.result);
    });

    it('should renew token when using throttle', async function () {
      // given API responding properly
      // first API call
      given('POST@/criteria/auth', generateAuth('[auth_token]', 1));
      given('POST@/criteria', generateResult(true)); // before token expires

      // test
      Switcher.buildContext(contextSettings);

      const switcher = Switcher.factory();
      switcher.throttle(500);

      const spyPrepare = spy(switcher, 'prepare');

      // first API call - stores result in cache
      let result = await switcher.isItOn('FLAG_3');
      assertTrue(result);
      assertSpyCalls(spyPrepare, 1);

      // first async API call
      result = await switcher.isItOn('FLAG_3');
      assertTrue(result);
      assertSpyCalls(spyPrepare, 1);

      // Next call should call the API again - token has expired
      await sleep(2000); // wait resolve async Promise
      
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(false)); // after token expires

      // test - stores result in cache after token renewal
      await sleep(500);
      result = await switcher.isItOn('FLAG_3');
      assertTrue(result);
      assertSpyCalls(spyPrepare, 2);

      await sleep(50);
      result = await switcher.isItOn('FLAG_3');
      assertFalse(result);
      assertSpyCalls(spyPrepare, 2);
    });

    it('should not crash when async checkCriteria fails', async function () {
      // given API responding properly
      // first API call
      given('POST@/criteria/auth', generateAuth('[auth_token]', 1));
      given('POST@/criteria', generateResult(true)); // before token expires

      // test
      let asyncErrorMessage = null;
      Switcher.buildContext(contextSettings);
      Switcher.subscribeNotifyError((error) => asyncErrorMessage = error.message);

      const switcher = Switcher.factory();
      switcher.throttle(1000);

      assertTrue(await switcher.isItOn('FLAG_1')); // sync
      assertTrue(await switcher.isItOn('FLAG_1')); // async

      // Next call should call the API again - valid token but crashes on checkCriteria
      await sleep(1000);
      assertEquals(asyncErrorMessage, null);

      // given
      given('POST@/criteria', { message: 'error' }, 500);
      assertTrue(await switcher.isItOn('FLAG_1')); // async

      await sleep(1000);
      assertEquals(asyncErrorMessage, 'Something went wrong: [checkCriteria] failed with status 500');
    });
  });

  describe('force remote (hybrid):', function () {
    
    const forceRemoteOptions = { 
      local: true, 
      snapshotLocation: './snapshot/',
      regexSafe: false
    };

    afterEach(function() {
      tearDown();
    });

    it('should return true - snapshot switcher is true', async function () {
      Switcher.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Switcher.factory();
      await Switcher.loadSnapshot();
      assertTrue(await switcher.isItOn('FF2FOR2030'));
    });

    it('should return false - same switcher return false when remote', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateResult(false));

      // test
      Switcher.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Switcher.factory();
      const executeRemoteCriteria = spy(switcher, '_executeRemoteCriteria');
      
      await Switcher.loadSnapshot();
      assertFalse(await switcher.remote().isItOn('FF2FOR2030'));
      assertSpyCalls(executeRemoteCriteria, 1);
    });

    it('should return true - including reason and metadata', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', generateDetailedResult({
        result: true, 
        reason: 'Success',
        metadata: { 
          user: 'user1',
        }
      }));

      // test
      Switcher.buildContext(contextSettings);

      const switcher = Switcher.factory();
      const detailedResult = await switcher.detail().isItOn('FF2FOR2030') as ResultDetail;
      assertTrue(detailedResult.result);
      assertEquals(detailedResult.reason, 'Success');
      assertEquals(detailedResult.metadata, { user: 'user1' });
    });

    it('should return error when local is not enabled', async function () {
      Switcher.buildContext(contextSettings, { regexSafe: false, local: false });

      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.remote().isItOn('FF2FOR2030'),
        Error, 'Local mode is not enabled');
    });

  });

  describe('check fail response (e2e):', function () {

    let contextSettings: SwitcherContext;

    afterAll(function() {
      Switcher.unloadSnapshot();
    });

    beforeEach(function() {
      tearDown();
      Switcher.testMode();
  
      contextSettings = { 
        url: 'http://localhost:3000',
        apiKey: '[apiKey]', 
        domain: '[domain]', 
        component: '[component]', 
        environment: 'default' 
      };
    });

    it('should NOT be valid - API returned 429 (too many requests) at checkHealth/auth', async function () {
      // given API responding properly
      given('POST@/criteria/auth', { error: 'Too many requests' }, 429);

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.isItOn('FLAG_1'),
        Error, 'Something went wrong: [auth] failed with status 429');
    });

    it('should NOT be valid - API returned 429 (too many requests) at checkCriteria', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', { error: 'Too many requests' }, 429);

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.isItOn('FLAG_1'),
        Error, 'Something went wrong: [checkCriteria] failed with status 429');
    });

    it('should use silent mode when fail to check switchers', async function() {
      Switcher.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './snapshot/' });
      await assertRejects(async () =>
        await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']),
        Error, 'Something went wrong: [FEATURE01,FEATURE02] not found');

      await Switcher.checkSwitchers(['FF2FOR2021', 'FF2FOR2021']);
    });

    it('should use silent mode when fail to check criteria', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria', { error: 'Too many requests' }, 429);

      // test
      let asyncErrorMessage = null;
      Switcher.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './snapshot/' });
      Switcher.subscribeNotifyError((error) => asyncErrorMessage = error.message);

      const switcher = Switcher.factory();
      
      assertTrue(await switcher.isItOn('FF2FOR2022'));
      assertEquals(asyncErrorMessage, 'Something went wrong: [checkCriteria] failed with status 429');
    });

  });

  describe('check criteria:', function () {

    beforeEach(function() {
      tearDown();
    });

    it('should be valid', async function () {
      // given API responding properly
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

      assertEquals(switcher.input, [
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

    it('should not throw when switcher keys provided were configured properly', async function() {
      //given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', { not_found: [] });

      //test
      Switcher.buildContext(contextSettings);

      let error: Error | undefined;
      await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']).catch(err => error = err);
      assertEquals(error, undefined);
    });

    it('should throw when switcher keys provided were not configured properly', async function() {
      //given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', { not_found: ['FEATURE02'] });

      //test
      Switcher.buildContext(contextSettings);
      await assertRejects(async () =>
        await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']),
        Error, 'Something went wrong: [FEATURE02] not found');
    });

    it('should throw when no switcher keys were provided', async function() {
      //given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
      given('POST@/criteria/switchers_check', undefined, 422);

      //test
      Switcher.buildContext(contextSettings);
      await assertRejects(async () =>
        await Switcher.checkSwitchers([]),
        Error, 'Something went wrong: [checkSwitchers] failed with status 422');
    });

    it('should throw when certPath is invalid', function() {
      assertThrows(() => Switcher.buildContext(contextSettings, { certPath: 'invalid' }));
    });
    
    it('should renew the token after expiration', async function () {
      // given API responding properly
      given('POST@/criteria/auth', generateAuth('[auth_token]', 1));

      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      const spyPrepare = spy(switcher, 'prepare');

      // Prepare the call generating the token
      given('POST@/criteria', generateResult(true));
      await switcher.prepare('MY_FLAG');
      assertTrue(await switcher.isItOn());

      // The program delay 2 secs later for the next call
      await sleep(2000);

      // Prepare the stub to provide the new token
      given('POST@/criteria/auth', generateAuth('asdad12d2232d2323f', 1));

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      given('POST@/criteria', generateResult(false));
      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 2);

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      given('POST@/criteria', generateResult(false));
      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyPrepare, 2);
    });

    it('should be valid - when sending key without calling prepare', async function () {
      // given API responding properly
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

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responding properly
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

    it('should be invalid - Missing API url field', async function () {
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext({ 
        url: undefined,
        apiKey: '[apiKey]', 
        domain: '[domain]', 
        component: '[component]', 
        environment: 'default' 
      });

      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Invalid URL');
    });

    it('should be invalid - Missing API Key field', async function () {
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext({ 
        url: 'http://localhost:3000',
        apiKey: undefined, 
        domain: '[domain]', 
        component: '[component]', 
        environment: 'default' 
      });

      const switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Missing API Key field');
    });

    it('should be invalid - Missing key field', async function () {
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Missing key field');
    });

    it('should be invalid - Missing component field', async function () {
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext({ 
        url: 'http://localhost:3000',
        apiKey: '[apiKey]', 
        domain: '[domain]', 
        component: undefined, 
        environment: 'default' 
      });

      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn('MY_FLAG'),
        Error, 'Something went wrong: Missing component field');
    });

    it('should be invalid - Missing token field', async function () {
      // given
      given('POST@/criteria/auth', generateAuth(undefined, 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      
      await assertRejects(async () =>
        await switcher.isItOn('MY_FLAG'),
        Error, 'Something went wrong: Missing token field');
    });

    it('should be invalid - bad strategy input', async function () {
      // given
      given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();
      await switcher.prepare('MY_WRONG_FLAG', [['THIS IS WRONG']]);

      await assertRejects(async () =>
        await switcher.isItOn(),
        Error, 'Something went wrong: Invalid input format for \'THIS IS WRONG\'');
    });

    it('should run in silent mode', async function () {
      // setup context to read the snapshot in case the API does not respond
      Switcher.buildContext(contextSettings, {
        snapshotLocation: './snapshot/',
        regexSafe: false,
        silentMode: '2s',
      });
      
      const switcher = Switcher.factory();
      const spyRemote = spy(switcher, '_executeRemoteCriteria');

      // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      givenError('POST@/criteria/auth', 'ECONNREFUSED');
      assertTrue(await switcher.isItOn('FF2FOR2030'));

      await sleep(500);
      // The call below is in silent mode. It is getting the configuration from the local snapshot again
      assertTrue(await switcher.isItOn());

      // As the silent mode was configured to retry after 2 seconds, it's still in time, 
      // therefore, remote call was not yet invoked
      assertSpyCalls(spyRemote, 0);
      await sleep(3000);
      
      // Setup the remote mocked response and made it to return false just to make sure it's not fetching from the snapshot
      given('GET@/check', undefined, 200);
      given('POST@/criteria/auth', generateAuth('[auth_token]', 10));
      given('POST@/criteria', generateResult(false));

      // Auth is async when silent mode is enabled to prevent blocking the execution while the API is not available
      assertTrue(await switcher.isItOn());
      assertFalse(await switcher.isItOn());
      assertSpyCalls(spyRemote, 1);
    });

    it('should throw error if not in silent mode', async function () {
      givenError('POST@/criteria/auth', 'ECONNREFUSED');

      // test
      Switcher.buildContext(contextSettings);
      const switcher = Switcher.factory();

      await assertRejects(async () =>
        await switcher.isItOn('FF2FOR2030'),
        Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
    });

    it('should run in silent mode when API is unavailable', async function () {
      Switcher.buildContext(contextSettings, {
        snapshotLocation: './snapshot/',
        regexSafe: false,
        silentMode: '5m'
      });

      const switcher = Switcher.factory();
      assertTrue(await switcher.isItOn('FF2FOR2030'));
    });

  });
});