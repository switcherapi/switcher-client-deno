import { describe, it, afterAll, afterEach, beforeEach, 
  assertEquals, assertFalse, 
  assertSpyCalls, spy } from './deps.ts';
import { given, tearDown, assertTrue, generateAuth, generateResult, sleep } from './helper/utils.ts'

import { Client, type SwitcherResult, type SwitcherContext } from '../mod.ts';
import ExecutionLogger from '../src/lib/utils/executionLogger.ts';

describe('Switcher Throttle:', function () {
  let contextSettings: SwitcherContext;
  
  afterAll(function() {
    Client.unloadSnapshot();
  });

  afterEach(function() {
    tearDown();
  });

  beforeEach(function() {
    tearDown();
    ExecutionLogger.clearLogger();
    Client.testMode();

    contextSettings = { 
      url: 'http://localhost:3000',
      apiKey: '[apiKey]', 
      domain: '[domain]', 
      component: '[component]', 
      environment: 'default' 
    };
  });

  it('should be valid - throttle', async function () {
    // given API responses
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
    given('POST@/criteria', generateResult(true));

    // test
    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher();
    switcher.throttle(1000);

    const spyExecutionLogger = spy(ExecutionLogger, 'add');

    assertTrue(await switcher.isItOn('FLAG_1')); // sync
    assertTrue(await switcher.isItOn('FLAG_1')); // async
    await sleep(100); // wait resolve async Promise

    assertSpyCalls(spyExecutionLogger, 1);
  });
  
  it('should be valid - throttle - with details', async function () {
    // given API responses
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
    given('POST@/criteria', generateResult(true));

    // test
    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher();
    switcher.throttle(1000);

    // first API call - stores result in cache
    await switcher.isItOn('FLAG_2');

    // first async API call
    const response = await switcher.detail().isItOn('FLAG_2') as SwitcherResult;
    assertTrue(response.result);
  });

  it('should renew token when using throttle', async function () {
    // given API responses
    // first API call
    given('POST@/criteria/auth', generateAuth('[auth_token]', 1));
    given('POST@/criteria', generateResult(true)); // before token expires

    // test
    Client.buildContext(contextSettings);

    const switcher = Client.getSwitcher()
      .throttle(500)
      .detail();

    const spyPrepare = spy(switcher, 'prepare');

    // 1st - calls remote API and stores result in cache
    let isItOn = await switcher.isItOn('FLAG_3') as SwitcherResult;
    assertTrue(isItOn.result);
    assertEquals(isItOn.metadata, undefined);
    assertSpyCalls(spyPrepare, 1);

    // 2nd - uses cached result
    isItOn = await switcher.isItOn('FLAG_3') as SwitcherResult;
    assertTrue(isItOn.result);
    assertTrue((isItOn.metadata as { cached: boolean }).cached);
    assertSpyCalls(spyPrepare, 1);

    // should call the remote API - token has expired
    await sleep(2000); // wait resolve async Promise
    
    // given
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
    given('POST@/criteria', generateResult(false)); // after token expires

    // 3rd - use cached result, asynchronous renew token and stores new result in cache
    isItOn = await switcher.isItOn('FLAG_3') as SwitcherResult;
    assertTrue(isItOn.result);
    assertSpyCalls(spyPrepare, 2);

    // 4th - uses cached result
    await sleep(50);
    isItOn = await switcher.isItOn('FLAG_3') as SwitcherResult;
    assertFalse(isItOn.result);
    assertSpyCalls(spyPrepare, 2);
  });

  it('should flush executions from a specific switcher key', async function () {
    // given API responses
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));
    given('POST@/criteria', generateResult(true));

    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher('FLAG_1').throttle(1000);
    
    // when
    assertTrue(await switcher.isItOn());
    let switcherExecutions = ExecutionLogger.getByKey('FLAG_1');
    assertEquals(switcherExecutions.length, 1);

    // test
    switcher.flushExecutions();
    switcherExecutions = ExecutionLogger.getByKey('FLAG_1');
    assertEquals(switcherExecutions.length, 0);
  });

  it('should not crash when async checkCriteria fails', async function () {
    // given API responses
    // first API call
    given('POST@/criteria/auth', generateAuth('[auth_token]', 1));
    given('POST@/criteria', generateResult(true)); // before token expires

    // test
    let asyncErrorMessage = null;
    Client.buildContext(contextSettings);
    Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);

    const switcher = Client.getSwitcher();
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