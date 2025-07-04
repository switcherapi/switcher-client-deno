import { load } from '../deps.ts';
import { type Switcher, Client } from '../../mod.ts'
import { sleep } from "../helper/utils.ts";

await load({ export: true, envPath: '.env' });

const SWITCHER_KEY = 'CLIENT_DENO_FEATURE';
const apiKey = Deno.env.get('SWITCHER_API_KEY') ?? '';
const domain = 'Switcher API';
const component = 'switcher4deno';
const environment = 'default';
const url = 'https://api.switcherapi.com';
const snapshotLocation = './tests/playground/snapshot/';

let switcher: Switcher;

/**
 * Playground environment for showcasing the API
 */
async function setupSwitcher(local: boolean) {
    Client.buildContext({ url, apiKey, domain, component, environment }, { snapshotLocation, local, logger: true });
    await Client.loadSnapshot({ fetchRemote: local })
        .then(version => console.log('Snapshot loaded - version:', version))
        .catch(() => console.log('Failed to load Snapshot'));
}

/**
 * This code snippet is a minimal example of how to configure and use Switcher4Deno locally.
 * No remote API account is required.
 * 
 * Snapshot is loaded from file at tests/playground/snapshot/local.json
 */
const _testLocal = async () => {
    Client.buildContext({ 
        domain: 'Local Playground', 
        environment: 'local' 
    }, { 
        snapshotLocation: './tests/playground/snapshot', 
        local: true
    });

    await Client.loadSnapshot()
        .then(version => console.log('Snapshot loaded - version:', version))
        .catch(() => console.log('Failed to load Snapshot'));

    switcher = Client.getSwitcher(SWITCHER_KEY)
            .detail();

    setInterval(() => {
        const time = Date.now();
        const result = switcher.isItOn();
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSimpleAPICall = async (local: boolean) => {
    await setupSwitcher(local);
    
    await Client.checkSwitchers([SWITCHER_KEY])
        .then(() => console.log('Switcher checked'))
        .catch(error => console.log(error));

    switcher = Client.getSwitcher();

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.detail().isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Client.checkSwitchers([SWITCHER_KEY]);
    Client.subscribeNotifyError((error) => console.log(error));

    switcher = Client.getSwitcher();
    switcher.throttle(1000);

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher
            .detail()
            .isItOn(SWITCHER_KEY);
            
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);

    Client.unloadSnapshot();
};

// Requires remote API
const _testSnapshotUpdate = async () => {
    setupSwitcher(false);
    await sleep(2000);
    
    console.log('checkSnapshot:', await Client.checkSnapshot());
};

// Does not require remote API
const _testAsyncCall = async () => {
    setupSwitcher(true);
    switcher = Client.getSwitcher();

    console.log("Sync:", await switcher.isItOn(SWITCHER_KEY));

    (switcher.isItOn(SWITCHER_KEY) as Promise<boolean>)
        .then(res => console.log('Promise result:', res))
        .catch(error => console.log(error));
};

// Does not require remote API
const _testBypasser = async () => {
    setupSwitcher(true);
    switcher = Client.getSwitcher();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.assume(SWITCHER_KEY).true();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.forget(SWITCHER_KEY);
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.unloadSnapshot();
};

// Requires remote API
const _testWatchSnapshot = async () => {
    Client.buildContext({ url, apiKey, domain, component, environment }, { snapshotLocation, local: true, logger: true });
    await Client.loadSnapshot({ fetchRemote: true })
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));

    Client.watchSnapshot({
        success: () => console.log('In-memory snapshot updated'),
        reject: (err: Error) => console.log(err)
    });

    const switcher = Client.getSwitcher(SWITCHER_KEY)
        .detail()
        .throttle(1000);

    setInterval(() => {
        const time = Date.now();
        const result = switcher.isItOn(SWITCHER_KEY);
            
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Does not require remote API
const _testWatchSnapshotContextOptions = async () => {
    Client.buildContext({ domain, environment }, { 
        snapshotLocation,
        snapshotWatcher: true,
        local: true, 
        logger: true 
    });

    await Client.loadSnapshot();

    const switcher = Client.getSwitcher();
    
    setInterval(async () => {
        const time = Date.now();
        const result = await switcher
            .detail()
            .isItOn(SWITCHER_KEY);
            
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSnapshotAutoUpdate = async () => {
    Client.buildContext({ url, apiKey, domain, component, environment }, 
        { local: true, logger: true });

    await Client.loadSnapshot({ fetchRemote: true });
    const switcher = Client.getSwitcher();

    Client.scheduleSnapshotAutoUpdate(3, {
        success: (updated) => console.log('In-memory snapshot updated', updated),
        reject: (err: Error) => console.log(err)
     });

    setInterval(async () => {
        const time = Date.now();
        await switcher.isItOn(SWITCHER_KEY);
        console.clear();
        console.log(Client.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

_testLocal();