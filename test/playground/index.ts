import { Switcher, checkValue, checkNumeric } from '../../mod.ts'

const SWITCHER_KEY = 'MY_SWITCHER';
const apiKey = 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT';
const domain = 'Playground';
const component = 'switcher-playground';
const environment = 'default';
const url = 'https://switcherapi.com/api';
const snapshotLocation = './snapshot/';

let switcher: Switcher;

/**
 * Playground environment for showcasing the API
 */
async function setupSwitcher(offline: boolean) {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { offline, logger: true });
    await Switcher.loadSnapshot(false, true)
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));
}

// Requires online API
const _testSimpleAPICall = async (offline: boolean) => {
    await setupSwitcher(offline);
    
    await Switcher.checkSwitchers([SWITCHER_KEY])
        .then(() => console.log('Switcher checked'))
        .catch(error => console.log(error));

    switcher = Switcher.factory();

    while(true) {
        const time = Date.now();
        const result = await switcher.isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${result}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
const _testWatchSnapshot = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { snapshotLocation, offline: true, logger: true });
    await Switcher.loadSnapshot(false, true)
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));

    const switcher = Switcher.factory();

    Switcher.watchSnapshot(
        async () => console.log('In-memory snapshot updated', await switcher.isItOn(SWITCHER_KEY)), 
        (err: Error) => console.log(err));
};

// Requires online API
const _testSnapshotAutoUpdate = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, 
        { offline: true, logger: true });

    await Switcher.loadSnapshot(false, true);
    const switcher = Switcher.factory();

    Switcher.scheduleSnapshotAutoUpdate(3, 
        (updated) => console.log('In-memory snapshot updated', updated), 
        (err: Error) => console.log(err));

    setInterval(async () => {
        const time = Date.now();
        await switcher.isItOn(SWITCHER_KEY, [checkValue('user_1')]);
        console.clear();
        console.log(Switcher.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

_testSimpleAPICall(true);