import { describe, it, assertExists, assertGreater, load } from './deps.ts';
import { assertTrue } from "./helper/utils.ts";

import { Client } from '../mod.ts';

await load({ export: true, envPath: '.env' });

describe('Switcher integrated test', () => {

    const contextSettings = {
        url: 'https://api.switcherapi.com',
        apiKey: Deno.env.get('SWITCHER_API_KEY') ?? '',
        domain: 'Switcher API',
        component: 'switcher4deno'
    };

    it('should hit remote API and return Switcher response', async function () {
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

    it('should load snapshot from remote API', async function () {
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

    it('should check Switcher availability', async function () {
        if (!Deno.env.get('SWITCHER_API_KEY')) {
            return;
        }

        // given context build
        Client.buildContext(contextSettings);

        // test
        await Client.checkSwitchers(['CLIENT_DENO_FEATURE']);
        
        assertTrue(true);
    });

});