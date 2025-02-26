import { describe, it, afterAll, beforeEach, assertRejects, assertFalse, assertExists, assertEquals, delay, existsSync } from './deps.ts';
import { given, givenError, tearDown, generateAuth, generateStatus, assertTrue, WaitSafe } from './helper/utils.ts';

import { Client } from '../mod.ts';
import type { SwitcherContext } from '../src/types/index.d.ts';

const testSettings = { sanitizeOps: false, sanitizeResources: false, sanitizeExit: false };

describe('E2E test - Client local - Snapshot:', function () {
  const token = '[token]';
  let contextSettings: SwitcherContext;

  const dataBuffer = Deno.readTextFileSync('./tests/snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  const dataBufferV2 = Deno.readTextFileSync('./tests/snapshot/dev_v2.json');
  const dataJSONV2 = dataBufferV2.toString();

  beforeEach(function() {
    Client.unloadSnapshot();
    
    contextSettings = { 
      url: 'http://localhost:3000',
      apiKey: '[api_key]',
      domain: 'Business',
      component: 'business-service',
      environment: 'dev'
    };
    
    Client.buildContext(contextSettings, {
      snapshotLocation: './tests/snapshot/',
      local: true,
      regexSafe: false
    });

    Client.testMode();
    tearDown();
  });

  afterAll(function() {
    Client.unloadSnapshot();
    if (existsSync('generated-snapshots/'))
      Deno.removeSync('generated-snapshots/', { recursive: true });
  });

  it('should NOT update snapshot - Too many requests at checkSnapshotVersion', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', undefined, 429);
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertRejects(async () =>
        await Client.checkSnapshot(),
        Error, 'Something went wrong: [checkSnapshotVersion] failed with status 429');
  });

  it('should NOT update snapshot - Too many requests at resolveSnapshot', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false)); // Snapshot outdated
    given('POST@/graphql', undefined, 429);

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      regexSafe: false
    });

    await assertRejects(async () =>
      await Client.loadSnapshot(),
      Error, 'Something went wrong: [resolveSnapshot] failed with status 429');
  });

  it('should update snapshot', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot();
    assertTrue(await Client.checkSnapshot());
  });

  it('should update snapshot - store file', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot({ watchSnapshot: true });
    assertTrue(await Client.checkSnapshot());
    assertTrue(existsSync(`generated-snapshots/${contextSettings.environment}.json`));

    //restore state to avoid process leakage
    Client.unloadSnapshot();
  });

  it('should update snapshot during load - store file', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot({ watchSnapshot: true, fetchRemote: true });
    assertTrue(existsSync(`generated-snapshots/${contextSettings.environment}.json`));

    //restore state to avoid process leakage
    Client.unloadSnapshot();
  });

  it('should auto update snapshot every second', testSettings, async function () {
    await delay(3000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false,
      snapshotAutoUpdateInterval: 1
    });

    let snapshotUpdated = false;
    Client.scheduleSnapshotAutoUpdate(1, {
      success: (updated) => snapshotUpdated = updated
    });

    await Client.loadSnapshot({ fetchRemote: true });
    
    const switcher = Client.getSwitcher();
    assertFalse(await switcher.isItOn('FF2FOR2030'));
    
    //given new version
    given('POST@/graphql', JSON.parse(dataJSONV2));

    WaitSafe.limit(2000);
    await WaitSafe.wait();

    assertTrue(snapshotUpdated);
    assertTrue(await switcher.isItOn('FF2FOR2030'));

    Client.terminateSnapshotAutoUpdate();
  });

  it('should NOT auto update snapshot ', testSettings, async function () {
    await delay(3000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });

    let error: Error | undefined;
    Client.scheduleSnapshotAutoUpdate(1, {
      reject: (err: Error) => error = err
    });
    
    await Client.loadSnapshot({ fetchRemote: true });

    //next call will fail
    givenError('POST@/graphql', 'ECONNREFUSED');

    WaitSafe.limit(2000);
    await WaitSafe.wait();

    assertExists(error);
    assertEquals(error.message, 'Something went wrong: Connection has been refused - ECONNREFUSED');

    //tearDown
    Client.terminateSnapshotAutoUpdate();
  });

  it('should NOT update snapshot', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(true)); // No available update
    
    //test
    await Client.loadSnapshot();
    assertFalse(await Client.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    givenError('GET@/criteria/snapshot_check/:version', 'ECONNREFUSED');
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertRejects(async () =>
      await Client.checkSnapshot(), 
      Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT update snapshot - resolve Snapshot Error', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false));
    givenError('POST@/graphql', 'ECONNREFUSED');
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertRejects(async () =>
      await Client.checkSnapshot(),
      Error, 'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT check snapshot with success - Snapshot not loaded', testSettings, async function () {
    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(true));
    
    //pre-load snapshot
    Client.testMode(false);
    await Client.loadSnapshot();
    assertFalse(await Client.checkSnapshot());

    //unload snapshot
    Client.unloadSnapshot();
    
    //test
    let error: Error | undefined;
    await Client.checkSnapshot().catch((err: Error) => error = err);
    assertExists(error);
    assertEquals(error.message, 'Something went wrong: Snapshot is not loaded. Use Client.loadSnapshot()');
  });

  it('should update snapshot', testSettings, async function () {
    await delay(2000);

    //given
    given('POST@/criteria/auth', generateAuth(token, 5));
    given('GET@/criteria/snapshot_check/:version', generateStatus(false)); // Snapshot outdated
    given('POST@/graphql', JSON.parse(dataJSON));

    //test
    Client.buildContext(contextSettings, {
      snapshotLocation: 'generated-snapshots/',
      regexSafe: false
    });

    await Client.loadSnapshot();
    assertExists(Client.snapshot);
  });

  it('should not throw when switcher keys provided were configured properly', testSettings, async function () {
    await delay(2000);
    
    await Client.loadSnapshot();

    let error: Error | undefined;
    await Client.checkSwitchers(['FF2FOR2030']).catch((err: Error) => error = err);
    assertEquals(error, undefined);
  });

  it('should throw when switcher keys provided were not configured properly', testSettings, async function () {
    await delay(2000);
    
    await Client.loadSnapshot();
    await assertRejects(async () =>
      await Client.checkSwitchers(['FEATURE02']),
      Error, 'Something went wrong: [FEATURE02] not found');
  });

  it('should be invalid - Load snapshot was not called', testSettings, async function () {
    Client.buildContext(contextSettings, {
      local: true, logger: true, regexSafe: false
    });
    
    const switcher = Client.getSwitcher();
    await assertRejects(async () =>
      await switcher.isItOn('FF2FOR2030'),
      Error, 'Snapshot not loaded. Try to use \'Client.loadSnapshot()\'');
  });

});