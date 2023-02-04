// deno-lint-ignore-file no-explicit-any
import { describe, it, afterAll, beforeEach } from 'https://deno.land/std@0.176.0/testing/bdd.ts';
import { assertRejects, assertExists, assertFalse } from 'https://deno.land/std@0.176.0/testing/asserts.ts';
import { given, givenError, tearDown, assertTrue, generateAuth, generateStatus } from './helper/utils.ts';

import { Switcher } from '../mod.ts';

const testSettings = { sanitizeExit: false, sanitizeResources: false };

describe('E2E test - Switcher offline - Snapshot:', function () {
  const token = '[token]';
  let contextSettings: any;

  const dataBuffer = Deno.readTextFileSync('./snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  beforeEach(function() {
    contextSettings = { 
      url: 'http://localhost:3000',
      apiKey: '[api_key]',
      domain: 'Business',
      component: 'business-service',
      environment: 'dev'
    };
    
    Switcher.buildContext(contextSettings, {
      offline: true
    });

    Switcher.setTestEnabled();
    tearDown();
  });

  afterAll(function() {
    Switcher.unloadSnapshot();
    Deno.removeSync('generated-snapshots/', { recursive: true });
  });

  it('should update snapshot', testSettings, async function () {
    //give
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Switcher.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      offline: true
    });
    
    await Switcher.loadSnapshot(true);
    assertTrue(await Switcher.checkSnapshot());

    //restore state to avoid process leakage
    Switcher.unloadSnapshot();
  });

  it('should NOT update snapshot', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(true)); // No available update
    
    //test
    await Switcher.loadSnapshot();
    assertFalse(await Switcher.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    givenError('GET@/criteria/snapshot_check/:version', 'ECONNREFUSED');
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
      await Switcher.checkSnapshot(), 
      Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT update snapshot - resolve Snapshot Error', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false)); // Snapshot outdated
    givenError('POST@/graphql', 'ECONNREFUSED');
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
      await Switcher.checkSnapshot(),
      Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should update snapshot', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false)); // Snapshot outdated
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Switcher.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/'
    });

    await Switcher.loadSnapshot();
    assertExists(Switcher.snapshot);
  });

  it('should not throw when switcher keys provided were configured properly', testSettings, async function () {
    await Switcher.loadSnapshot();
    await Switcher.checkSwitchers(['FF2FOR2030']);
  });

  it('should throw when switcher keys provided were not configured properly', testSettings, async function () {
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
      await Switcher.checkSwitchers(['FEATURE02']),
      Error, 'Something went wrong: [FEATURE02] not found');
  });

  it('should be invalid - Load snapshot was not called', testSettings, async function () {
    Switcher.buildContext(contextSettings, {
      offline: true, logger: true
    });
    
    const switcher = Switcher.factory();
    await assertRejects(async () =>
      await switcher.isItOn('FF2FOR2030'),
      Error, 'Snapshot not loaded. Try to use \'Switcher.loadSnapshot()\'');
  });

});