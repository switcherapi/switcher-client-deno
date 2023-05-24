// deno-lint-ignore-file no-explicit-any
import { describe, it, afterAll, beforeEach } from 'https://deno.land/std@0.188.0/testing/bdd.ts';
import { assertEquals, assertFalse } from 'https://deno.land/std@0.188.0/testing/asserts.ts';
import { existsSync } from 'https://deno.land/std@0.110.0/fs/mod.ts';
import { assertTrue, WaitSafe } from './helper/utils.ts';

import { Switcher } from '../mod.ts';

const updateSwitcher = (status: boolean) => {
  const dataBuffer = Deno.readTextFileSync('./snapshot/dev.json');
  const dataJSON = JSON.parse(dataBuffer.toString());

  dataJSON.data.domain.group[0].config[0].activated = status;

  Deno.mkdirSync('generated-snapshots/', { recursive: true });
  Deno.writeTextFileSync('generated-snapshots/watch.json', JSON.stringify(dataJSON, null, 4));
};

const invalidateJSON = () => {
  Deno.mkdirSync('generated-snapshots/', { recursive: true });
  Deno.writeTextFileSync('generated-snapshots/watch.json', '[INVALID]');
};

describe('E2E test - Switcher offline - Watch Snapshot:', function () {
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'watch';

  beforeEach(async function() {
    updateSwitcher(true);
    Switcher.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true
    });

    await Switcher.loadSnapshot();
  });
  
  afterAll(function() {
    Switcher.unloadSnapshot();
    if (existsSync('generated-snapshots/'))
      Deno.removeSync('generated-snapshots/', { recursive: true });
  });

  it('should read from snapshot - without watching', function () {
    const switcher = Switcher.factory();
    switcher.isItOn('FF2FOR2030').then((val1) => {
      assertTrue(val1);
      updateSwitcher(false);

      switcher.isItOn('FF2FOR2030').then((val2) => {
        assertTrue(val2);
      });
    });
  });
  
  it('should read from updated snapshot', async function () {
    const switcher = Switcher.factory();
    Switcher.watchSnapshot(async () => {
      assertFalse(await switcher.isItOn('FF2FOR2030'));
      WaitSafe.finish();
    });

    switcher.isItOn('FF2FOR2030').then((val) => {
      assertTrue(val);
      updateSwitcher(false);
    });

    await WaitSafe.wait();
    Switcher.unloadSnapshot();
  });

  it('should NOT read from updated snapshot - invalid JSON', async function () {
    const switcher = Switcher.factory();
    Switcher.watchSnapshot(undefined, (err: any) => {
      assertEquals(err.message, 'Something went wrong: It was not possible to load the file at generated-snapshots/');
      WaitSafe.finish();
    });

    switcher.isItOn('FF2FOR2030').then((val) => {
      assertTrue(val);
      invalidateJSON();
    });

    await WaitSafe.wait();
    Switcher.unloadSnapshot();
  });

});