import { assertExists, assertGreater } from './deps.ts';

import { Client } from '../mod.ts';

const contextSettings = {
    url: Deno.env.get('SWITCHER_URL'),
    apiKey: Deno.env.get('SWITCHER_API_KEY') ?? '',
    domain: 'Switcher API',
    component: 'switcher4deno'
};

Deno.test('should hit remote API and return Switcher response', async function () {
    if (!Deno.env.get('SWITCHER_API_KEY')) {
        return;
    }
    
    // given context build
    Client.buildContext(contextSettings);

    // test
    const switcher = Client.getSwitcher().detail();
    const result = await switcher.isItOn('CLIENT_DENO_FEATURE');

    assertExists(result);
});

Deno.test('should load snapshot from remote API', async function () {
    if (!Deno.env.get('SWITCHER_API_KEY')) {
        return;
    }

    // given context build
    Client.buildContext(contextSettings, { local: true });

    // test
    await Client.loadSnapshot({ fetchRemote: true });

    const switcher = Client.getSwitcher().detail();
    const result = await switcher.isItOn('CLIENT_DENO_FEATURE');

    assertExists(result);
    assertGreater(Client.snapshotVersion, 0);
});

Deno.test('should check Switcher availability', function () {
    if (!Deno.env.get('SWITCHER_API_KEY')) {
        return;
    }

    // given context build
    Client.buildContext(contextSettings);

    // test
    return Client.checkSwitchers(['CLIENT_DENO_FEATURE']);
});