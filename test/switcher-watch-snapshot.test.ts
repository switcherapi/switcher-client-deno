// deno-lint-ignore-file no-explicit-any
import { describe, it, afterAll, beforeEach } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import { Switcher } from "../mod.ts";
import { WaitSafe } from "./fixture/utils.ts";

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
    Deno.removeSync("generated-snapshots/", { recursive: true });
  });

  it('should read from snapshot - without watching', function () {
    const switcher = Switcher.factory();
    switcher.isItOn('FF2FOR2030').then((val1) => {
      assertEquals(true, val1);
      updateSwitcher(false);

      switcher.isItOn('FF2FOR2030').then((val2) => {
        assertEquals(true, val2);
      });
    });
  });
  
  it('should read from updated snapshot', async function () {
    const switcher = Switcher.factory();
    Switcher.watchSnapshot(async () => {
      assertEquals(false, await switcher.isItOn('FF2FOR2030'));
      WaitSafe.finish();
    });

    switcher.isItOn('FF2FOR2030').then((val) => {
      assertEquals(true, val);
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
      assertEquals(true, val);
      invalidateJSON();
    });

    await WaitSafe.wait();
    Switcher.unloadSnapshot();
  });

});