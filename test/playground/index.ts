import { Switcher, checkValue, checkNumeric } from '../../mod.ts'

const SWITCHER_KEY = 'MY_SWITCHER';
const apiKey = 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT';
const domain = 'Playground';
const component = 'switcher-playground';
const environment = 'default';
const url = 'https://switcherapi.com/api';

let switcher;

/**
 * Playground environment for showcasing the API
 */
function setupSwitcher(offline: boolean) {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { offline, logger: true });
    Switcher.loadSnapshot()
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));
}

// Requires online API
const _testSimpleAPICall = async (offline: boolean) => {
    setupSwitcher(offline);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    switcher = Switcher.factory();
    await switcher.isItOn(SWITCHER_KEY, [checkValue('user_1')]);

    console.log(Switcher.getLogger(SWITCHER_KEY));
    Switcher.unloadSnapshot();
};

// Requires online API
const _testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    switcher = Switcher.factory();
    switcher.throttle(1000);

    for (let index = 0; index < 10; index++)
        console.log(`Call #${index} - ${await switcher.isItOn(SWITCHER_KEY, [checkNumeric('1')])}}`);

    Switcher.unloadSnapshot();
};

// Requires online API
const _testSnapshotUpdate = async () => {
    setupSwitcher(false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    switcher = Switcher.factory();
    console.log('checkSnapshot:', await Switcher.checkSnapshot());

    Switcher.unloadSnapshot();
};

const _testAsyncCall = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    console.log("Sync:", await switcher.isItOn(SWITCHER_KEY));

    switcher.isItOn(SWITCHER_KEY)
        .then(res => console.log('Promise result:', res))
        .catch(error => console.log(error));

    Switcher.unloadSnapshot();
};

const _testBypasser = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.assume(SWITCHER_KEY).true();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.forget(SWITCHER_KEY);
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

// Requires online API
const _testSnapshotAutoload = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment: 'generated' });
    await Switcher.loadSnapshot();

    switcher = Switcher.factory();
    const result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

// Requires online API
const _testWatchSnapshot = () => {
    setupSwitcher(true);
    const switcher = Switcher.factory();

    Switcher.watchSnapshot(
        async () => console.log('In-memory snapshot updated', await switcher.isItOn(SWITCHER_KEY)), 
        (err: Error) => console.log(err));
};

// Requires online API
const _testSnapshotAutoUpdate = () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, 
        { offline: true, logger: true, snapshotAutoUpdateInterval: 3000 });

    Switcher.loadSnapshot();
    const switcher = Switcher.factory();

    setInterval(async () => {
        const time = Date.now();
        await switcher.isItOn(SWITCHER_KEY, [checkValue('user_1')]);
        console.log(Switcher.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

_testSimpleAPICall(true);