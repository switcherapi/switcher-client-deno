// deno-lint-ignore-file no-explicit-any
import { describe, it, afterAll, beforeEach, assertEquals, assertFalse, existsSync, delay } from './deps.ts';
import { assertTrue, WaitSafe } from './helper/utils.ts';

import { Client } from '../mod.ts';

const domain = 'Business';
const component = 'business-service';
const environment = 'watch';

const updateSwitcher = (status: boolean) => {
  const dataBuffer = Deno.readTextFileSync('./tests/snapshot/dev.json');
  const dataJSON = JSON.parse(dataBuffer.toString());

  dataJSON.data.domain.group[0].config[0].activated = status;

  Deno.mkdirSync('generated-snapshots/', { recursive: true });
  Deno.writeTextFileSync('generated-snapshots/watch.json', JSON.stringify(dataJSON, null, 4));
};

const invalidateJSON = () => {
  Deno.mkdirSync('generated-snapshots/', { recursive: true });
  Deno.writeTextFileSync('generated-snapshots/watch.json', '[INVALID]');
};

describe('E2E test - Client local - Watch Snapshot (watchSnapshot):', function () {
  beforeEach(async function() {
    updateSwitcher(true);
    Client.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });

    await Client.loadSnapshot();
  });
  
  afterAll(function() {
    Client.unloadSnapshot();
    if (existsSync('generated-snapshots/'))
      Deno.removeSync('generated-snapshots/', { recursive: true });
  });

  it('should read from snapshot - without watching', async function () {
    const switcher = Client.getSwitcher();

    let result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
    updateSwitcher(false);

    result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
  });
  
  it('should read from updated snapshot', async function () {
    const switcher = Client.getSwitcher();
    Client.watchSnapshot({
      success: async () => {
        assertFalse(await switcher.isItOn('FF2FOR2030'));
        WaitSafe.finish();
      }
    });

    const result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
    updateSwitcher(false);

    await WaitSafe.wait();
    Client.unloadSnapshot();
  });

  it('should NOT read from updated snapshot - invalid JSON', async function () {
    const switcher = Client.getSwitcher();
    Client.watchSnapshot({
      reject: (err: any) => {
        assertEquals(err.message, 'Something went wrong: It was not possible to load the file at generated-snapshots/');
        WaitSafe.finish();
      }
    });

    const result = await switcher.isItOn('FF2FOR2030');
    assertTrue(result);
    invalidateJSON();

    await WaitSafe.wait();
    Client.unloadSnapshot();
  });

  it('should NOT allow to watch snapshot - Client test is enabled', async function () {
    Client.testMode();
    Client.watchSnapshot({
      reject: (err: any) => {
        assertEquals(err.message, 'Watch Snapshot cannot be used in test mode or without a snapshot location');
        WaitSafe.finish();
      }
    });

    await WaitSafe.wait();
    Client.unloadSnapshot();
    Client.testMode(false);
  });

});

describe('E2E test - Client local - Watch Snapshot (context):', function () {
  beforeEach(async function() {
    updateSwitcher(true);
    Client.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      snapshotWatcher: true,
      local: true,
      regexSafe: false
    });

    await Client.loadSnapshot();
  });
  
  afterAll(function() {
    Client.unloadSnapshot();
    if (existsSync('generated-snapshots/'))
      Deno.removeSync('generated-snapshots/', { recursive: true });
  });
  
  it('should read from updated snapshot', async function () {
    const switcher = Client.getSwitcher();
    assertTrue(switcher.isItOn('FF2FOR2030'));
    updateSwitcher(false);

    await delay(2000); // Wait for the snapshot to be updated
    assertFalse(switcher.isItOn('FF2FOR2030'));
    Client.unloadSnapshot();
  });
});