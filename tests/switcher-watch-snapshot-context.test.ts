import { assertFalse, existsSync, delay } from './deps.ts';
import { assertTrue } from './helper/utils.ts';

import { Client } from '../mod.ts';

const { test } = Deno;
const { beforeEach, afterAll } = test;

const domain = 'Business';
const component = 'business-service';
const environment = 'watch';

const updateSwitcher = (status: boolean) => {
  const dataBuffer = Deno.readTextFileSync('./tests/snapshot/dev.json');
  const dataJSON = JSON.parse(dataBuffer.toString());

  dataJSON.domain.group[0].config[0].activated = status;

  Deno.mkdirSync('generated-snapshots/', { recursive: true });
  Deno.writeTextFileSync('generated-snapshots/watch.json', JSON.stringify(dataJSON, null, 4));
};

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

test('should read from updated snapshot', async function () {
  const switcher = Client.getSwitcher();
  assertTrue(switcher.isItOn('FF2FOR2030'));
  updateSwitcher(false);

  await delay(2000); // Wait for the snapshot to be updated
  assertFalse(switcher.isItOn('FF2FOR2030'));
  Client.unloadSnapshot();
});