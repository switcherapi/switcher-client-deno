import { describe, it, afterAll, beforeEach, assertRejects, assertFalse, assertExists, assertEquals, delay, existsSync } from './deps.ts';
import { given, givenError, tearDown, generateAuth, generateStatus, assertTrue, WaitSafe } from './helper/utils.ts';

import { Switcher } from '../mod.ts';
import { SwitcherContext } from '../src/types/index.d.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

describe('E2E test - Switcher offline - Snapshot:', function () {
  const token = '[token]';
  let contextSettings: SwitcherContext;

  const dataBuffer = Deno.readTextFileSync('./snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  const dataBufferV2 = Deno.readTextFileSync('./snapshot/dev_v2.json');
  const dataJSONV2 = dataBufferV2.toString();

  beforeEach(function() {
    Switcher.unloadSnapshot();
    
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
    if (existsSync('generated-snapshots/'))
      Deno.removeSync('generated-snapshots/', { recursive: true });
  });

  it('should NOT update snapshot - Too many requests at checkSnapshotVersion', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', null, 429);
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
        await Switcher.checkSnapshot(),
        Error, 'Something went wrong: [checkSnapshotVersion] failed with status 429');

    //or
    await Switcher.checkSnapshot((err: Error) => {
      assertExists(err);
      assertEquals(err.message, 'Something went wrong: [checkSnapshotVersion] failed with status 429');
    });
  });

  it('should NOT update snapshot - Too many requests at resolveSnapshot', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false)); // Snapshot outdated
    given('POST@/graphql', null, 429);

    //test
    Switcher.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/'
    });

    await assertRejects(async () =>
      await Switcher.loadSnapshot(),
      Error, 'Something went wrong: [resolveSnapshot] failed with status 429');
  });

  it('should update snapshot', testSettings, async function () {
    await delay(2000);

    //given
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

  it('should auto update snapshot every 1000ms', testSettings, async function () {
    await delay(3000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Switcher.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      offline: true,
      snapshotAutoUpdateInterval: 500
    });

    //optional (already set in the buildContext)
    Switcher.scheduleSnapshotAutoUpdate(1000);
    
    await Switcher.loadSnapshot(false, true);
    
    const switcher = Switcher.factory();
    assertFalse(await switcher.isItOn('FF2FOR2030'));
    
    //given new version
    given('POST@/graphql', JSON.parse(dataJSONV2));

    WaitSafe.limit(2000);
    await WaitSafe.wait();
    assertTrue(await switcher.isItOn('FF2FOR2030'));

    Switcher.terminateSnapshotAutoUpdate();
  });

  it('should NOT update snapshot', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(true)); // No available update
    
    //test
    await Switcher.loadSnapshot();
    assertFalse(await Switcher.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', testSettings, async function () {
    await delay(2000);

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
    await delay(2000);

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
    await delay(2000);

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
    await delay(2000);

    await Switcher.loadSnapshot();
    await Switcher.checkSwitchers(['FF2FOR2030']);
  });

  it('should throw when switcher keys provided were not configured properly', testSettings, async function () {
    await delay(2000);
    
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