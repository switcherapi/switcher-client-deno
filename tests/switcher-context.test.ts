import { describe, it, beforeEach, assertRejects, assertThrows } from './deps.ts';
import { given, tearDown, generateAuth, assertTrue } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import { destroyHttpClient } from "../src/lib/remote.ts";

describe('Switcher Context:', function () {
  let contextSettings: SwitcherContext;

  beforeEach(function() {
    tearDown();

    contextSettings = { 
      url: 'http://localhost:3000',
      apiKey: '[apiKey]', 
      domain: '[domain]', 
      component: '[component]', 
      environment: 'default' 
    };
  });

  it('should throw when certPath is invalid', function() {
    assertThrows(() => Client.buildContext(contextSettings, { certPath: 'invalid' }));
  });

  it('should NOT throw when certPath is valid', function() {
    Client.buildContext(contextSettings, { certPath: './tests/helper/dummy-cert.pem' });
    destroyHttpClient();
    assertTrue(true);
  });

  it('should be invalid - Missing API url field', async function () {
    // given
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

    // test
    Client.buildContext({ 
      url: undefined,
      apiKey: '[apiKey]', 
      domain: '[domain]', 
      component: '[component]', 
      environment: 'default' 
    });

    const switcher = Client.getSwitcher();

    await assertRejects(async () =>
      await switcher.isItOn(),
      Error, 'Something went wrong: URL is required');
  });

  it('should be invalid - Missing API Key field', async function () {
    // given
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

    // test
    Client.buildContext({ 
      url: 'http://localhost:3000',
      apiKey: undefined, 
      domain: '[domain]', 
      component: '[component]', 
      environment: 'default' 
    });

    const switcher = Client.getSwitcher();

    await switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .prepare('MY_FLAG');

    await assertRejects(async () =>
      await switcher.isItOn(),
      Error, 'Something went wrong: API Key is required');
  });

  it('should be invalid - Missing key field', async function () {
    // given
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

    // test
    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher();

    await assertRejects(async () =>
      await switcher.isItOn(),
      Error, 'Something went wrong: Missing key field');
  });

  it('should be invalid - Missing component field', async function () {
    // given
    given('POST@/criteria/auth', generateAuth('[auth_token]', 5));

    // test
    Client.buildContext({ 
      url: 'http://localhost:3000',
      apiKey: '[apiKey]', 
      domain: '[domain]', 
      component: undefined, 
      environment: 'default' 
    });

    const switcher = Client.getSwitcher();

    await assertRejects(async () =>
      await switcher.isItOn('MY_FLAG'),
      Error, 'Something went wrong: Component is required');
  });

  it('should be invalid - Missing token field', async function () {
    // given
    given('POST@/criteria/auth', generateAuth(undefined, 5));

    // test
    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher();
    
    await assertRejects(async () =>
      await switcher.isItOn('MY_FLAG'),
      Error, 'Something went wrong: Missing token field');
  });

});