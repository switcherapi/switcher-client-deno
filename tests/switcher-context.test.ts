import { assertRejects, assertThrows, mf } from './deps.ts';
import { given, tearDown, generateAuth, assertTrue } from './helper/utils.ts'

import { Client, type SwitcherContext } from '../mod.ts';
import { destroyHttpClient } from "../src/lib/remote.ts";

const { test } = Deno;
const { beforeEach, afterEach } = test;

let contextSettings: SwitcherContext;
let mockFetch: mf.MockInstallation;

beforeEach(function() {
  mockFetch = mf.install();
  contextSettings = { 
    url: 'http://localhost:3000',
    apiKey: '[apiKey]', 
    domain: '[domain]', 
    component: '[component]', 
    environment: 'default' 
  };
});

afterEach(function() {
  tearDown(mockFetch.restore);
});

test('should throw when certPath is invalid', function() {
  assertThrows(() => Client.buildContext(contextSettings, { certPath: 'invalid' }));
});

test('should NOT throw when certPath is valid', function() {
  Client.buildContext(contextSettings, { certPath: './tests/helper/dummy-cert.pem' });
  destroyHttpClient();
  assertTrue(true);
});

test('should be invalid - Missing API url field', async function () {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));

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

test('should NOT throw when remoteTimeout is set', function() {
  Client.buildContext(contextSettings, { remoteTimeout: 5000 });
  assertTrue(true);
});

test('should be invalid - Missing API Key field', async function () {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));

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

test('should be invalid - Missing key field', async function () {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();

  await assertRejects(async () =>
    await switcher.isItOn(),
    Error, 'Something went wrong: Missing key field');
});

test('should be invalid - Missing component field', async function () {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth('[auth_token]', 5));

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

test('should be invalid - Missing token field', async function () {
  // given
  given(mockFetch.instance, 'POST /criteria/auth', generateAuth(undefined, 5));

  // test
  Client.buildContext(contextSettings);
  const switcher = Client.getSwitcher();
  
  await assertRejects(async () =>
    await switcher.isItOn('MY_FLAG'),
    Error, 'Something went wrong: Missing token field');
});