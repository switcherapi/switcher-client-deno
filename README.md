***

<div align="center">
<b>Switcher4Deno</b><br>
A Deno SDK for Switcher API
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-client-deno/actions/workflows/master.yml/badge.svg)](https://github.com/switcherapi/switcher-client-deno/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-client-deno&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-client-deno)
[![deno.land/x/switcher4deno](http://shield.deno.dev/x/switcher4deno)](https://deno.land/x/switcher4deno)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

***

![Switcher API: Deno Client: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_denoclient_transparency_1280.png)

# About  
Deno SDK for working with Switcher-API.
https://github.com/switcherapi/switcher-api

- Flexible and robust functions that will keep your code clean and maintainable.
- Able to work locally using a snapshot file downloaded from your remote Switcher-API Domain.
- Silent mode is a hybrid configuration that automatically enables a contingent sub-process in case of any connectivity issue.
- Built-in mock implementation for clear and easy implementation of automated testing.
- Easy to setup. Switcher Context is responsible to manage all the complexity between your application and API.

# Usage

## Module initialization
The context properties stores all information regarding connectivity.

> Flags required
```
--allow-read
--allow-write
--allow-net
--unstable (only if using certPath)
```

> Initialization
```ts
import { Switcher } from "https://deno.land/x/switcher4deno@v1.0.2/mod.ts";

const url = 'https://switcherapi.com/api';
const apiKey = '[API_KEY]';
const environment = 'default';
const domain = 'My Domain';
const component = 'MyApp';
```

- **url**: Swither-API url.
- **apiKey**: Switcher-API key generated to your component.
- **environment**: (optional) Environment name. Production environment is named as 'default'.
- **domain**: Domain name.
- **component**: Application name.

## Options
You can also activate features such as local and silent mode:

```ts
const local = true;
const logger = true;
const snapshotLocation = './snapshot/';
const snapshotAutoUpdateInterval = 3;
const silentMode = '5m';
const certPath = './certs/ca.pem';

Switcher.buildContext({ url, apiKey, domain, component, environment }, {
    local, logger, snapshotLocation, snapshotAutoUpdateInterval, silentMode, certPath
});

const switcher = Switcher.factory();
```

- **local**: If activated, the client will only fetch the configuration inside your snapshot file. The default value is 'false'.
- **logger**: If activated, it is possible to retrieve the last results from a given Switcher key using Switcher.getLogger('KEY')
- **snapshotLocation**: Location of snapshot files.
- **snapshotAutoUpdateInterval**: Enable Snapshot Auto Update given an interval in seconds (default: 0 disabled).
- **silentMode**: Enable contigency given the time for the client to retry - e.g. 5s (s: seconds - m: minutes - h: hours)
- **regexSafe**: Enable REGEX Safe mode - Prevent agaist reDOS attack (default: true).
- **regexMaxBlackList**: Number of entries cached when REGEX Strategy fails to perform (reDOS safe) - default: 50
- **regexMaxTimeLimit**: Time limit (ms) used by REGEX workers (reDOS safe) - default - 3000ms
- **certPath**: Path to the certificate file used to establish a secure connection with the API.

(*) regexSafe is a feature that prevents your application from being exposed to a reDOS attack. It is recommended to keep this feature enabled.<br>
However, this feature uses Web Worker API which is currently not compatible with compiled executables.

## Executing
There are a few different ways to call the API using the JavaScript module.
Here are some examples:

1. **No parameters**
Invoking the API can be done by instantiating the switcher and calling *isItOn* passing its key as a parameter.

```ts
const switcher = Switcher.factory();
await switcher.isItOn('FEATURE01');
```

2. **Promise**
Most functions were implemented using async operations. Here it is a differnet way to execute the criteria:

```ts
switcher.isItOn('KEY')
    .then(result => console.log('Result:', result))
    .catch(error => console.log(error));
```

3. **Strategy validation - preparing input**
Loading information into the switcher can be made by using *prepare*, in case you want to include input from a different place of your code. Otherwise, it is also possible to include everything in the same call.

```ts
import { checkValue, checkNetwork } from "https://deno.land/x/switcher4deno@[latest]/mod.ts";

switcher.prepare('FEATURE01', [checkValue('USER_1')];
switcher.isItOn();
```

4. **Strategy validation - all-in-one execution**
All-in-one method is fast and include everything you need to execute a complex call to the API.

```ts
await switcher.isItOn('FEATURE01', [
    checkValue('User 1'),
    checkNetwork('192.168.0.1')
]);
```

5. **Throttle**
Throttling is useful when placing Feature Flags at critical code blocks require zero-latency without having to switch to local.
API calls will happen asynchronously and the result returned is based on the last API response.

```ts
const switcher = Switcher.factory();
await switcher
    .throttle(1000)
    .isItOn('FEATURE01');
```

6. **Hybrid mode**
Forcing Switchers to resolve remotely can help you define exclusive features that cannot be resolved locally.
This feature is ideal if you want to run the SDK in local mode but still want to resolve a specific switcher remotely.

```ts
const switcher = Switcher.factory();
await switcher.remote().isItOn('FEATURE01');
```

## Built-in mock feature
You can also bypass your switcher configuration by invoking 'Switcher.assume'. This is perfect for your test code where you want to test both scenarios when the switcher is true and false.

```ts
Switcher.assume('FEATURE01').true();
switcher.isItOn('FEATURE01'); // true

Switcher.forget('FEATURE01');
switcher.isItOn('FEATURE01'); // Now, it's going to return the result retrieved from the API or the Snaopshot file
```

**Enabling Test Mode**
You may want to enable this feature while using Switcher Client with automated testing.
It prevents the Switcher Client from locking snapshot files even after the test execution.

To enable this feature, it is recommended to place the following on your test setup files:
```ts
Switcher.setTestEnabled();
```

**Smoke Test**
It can validate Switcher Keys on your testing pipelines before deploying a change.
Switcher Keys may not be configured correctly and can cause your code to have unwanted results.

This feature will validate using the context provided to check if everything is properly configured.
In case something is missing, this operation will throw an exception pointing out which Switcher Keys are not configured.
```ts
await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02'])
```

## Loading Snapshot from the API
This step is optional if you want to load a copy of the configuration that can be used to eliminate latency when local mode is activated.<br>
Activate watchSnapshot optionally passing true in the arguments.<br>
Auto load Snapshot from API passing true as second argument.

```ts
const version = await Switcher.loadSnapshot();
```

## Watch for Snapshot file changes
Activate and monitor snapshot changes using this feature. Optionally, you can implement any action based on the callback response.

```ts
Switcher.watchSnapshot(
    () =>  console.log('In-memory snapshot updated'), 
    (err: any) => console.log(err));
```

## Snapshot version check
For convenience, an implementation of a domain version checker is available if you have external processes that manage snapshot files.

```ts
Switcher.checkSnapshot();
```

## Snapshot Update Scheduler
You can also schedule a snapshot update using the method below.<br>
It allows you to run the Client SDK in local mode (zero latency) and still have the snapshot updated automatically.

```ts
Switcher.scheduleSnapshotAutoUpdate(1 * 60 * 60 * 24); // 24 hours
```