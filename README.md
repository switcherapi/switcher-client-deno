<div align="center">
<b>Switcher Client Deno SDK</b><br>
A Deno SDK for Switcher API
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-client-deno/actions/workflows/master.yml/badge.svg)](https://github.com/switcherapi/switcher-client-deno/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-client-deno&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-client-deno)
[![deno.land/x/switcher4deno](https://shield.deno.dev/x/switcher4deno)](https://deno.land/x/switcher4deno)
[![JSR](https://jsr.io/badges/@switcherapi/switcher-client-deno)](https://jsr.io/@switcherapi/switcher-client-deno)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

<div align="center">
  <img src="https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_denoclient_transparency_1280.png" alt="Switcher API: Deno Client" />
</div>

## Table of Contents

- [About](#-about)
  - [Key Features](#-key-features)
- [Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Basic Setup](#basic-setup)
- [Configuration](#️-configuration)
  - [Context Parameters](#context-parameters)
  - [Advanced Options](#advanced-options)
  - [Options Reference](#options-reference)
- [Usage Examples](#-usage-examples)
  - [Basic Feature Flag Check](#basic-feature-flag-check)
  - [Strategy Validation with Input Preparation](#strategy-validation-with-input-preparation)
  - [All-in-One Execution](#all-in-one-execution)
  - [Performance Optimization with Throttling](#performance-optimization-with-throttling)
  - [Hybrid Mode - Force Remote Resolution](#hybrid-mode---force-remote-resolution)
  - [Flush Cached Executions for a Switcher](#flush-cached-executions-for-a-switcher)
  - [Circuit Breaker](#circuit-breaker-silent-mode)
- [Testing & Development](#-testing--development)
  - [Built-in Stub Feature](#built-in-stub-feature)
  - [Test Mode](#test-mode)
  - [Smoke Testing](#smoke-testing)
- [Snapshot Management](#-snapshot-management)
  - [Loading Snapshots](#loading-snapshots)
  - [Real-time Snapshot Monitoring](#real-time-snapshot-monitoring)
  - [Snapshot Version Checking](#snapshot-version-checking)
  - [Automatic Snapshot Updates](#automatic-snapshot-updates)

## About

**Switcher Client Deno** (former Switcher4Deno) is a feature-rich SDK for integrating [Switcher API](https://github.com/switcherapi/switcher-api) into your Deno applications. It provides robust feature flag management with enterprise-grade capabilities.

### Key Features

- 🚀 **Zero Latency**: Local mode with snapshot files or in-memory for instant feature flag resolution
- 🔄 **Hybrid Configuration**: Silent mode with automatic fallback handling
- 🧪 **Testing Ready**: Built-in stub implementation for comprehensive testing
- ⚡ **Performance Optimized**: Throttling optimizes remote API calls to reduce bottlenecks in critical code paths
- 🛠️ **Developer Tools**: Runtime snapshot updates without app restart and automatic sync with remote API

## Quick Start

### Prerequisites

- **Deno**: Version 1.4x, 2.x or above
- **Permissions**:

| Permission | Required For |
|------------|--------------|
| `--allow-read` | Reading snapshot files and SSL certificates |
| `--allow-write` | Writing snapshot files (if enabled) |
| `--allow-net` | Communicating with the Switcher API |
| `--allow-env` | Accessing environment variables for configuration |
| `--unstable-http` | Required for custom SSL certificates in Deno v1.4x (see [Advanced Options](#advanced-options)) |

### Installation

```ts
// Via JSR (Recommended)
import { Client } from "@switcherapi/switcher-client-deno@[VERSION]";

// Via deno.land
import { Client } from 'https://deno.land/x/switcher4deno@v[VERSION]/mod.ts';
```

### Basic Setup

```ts
import { Client } from "@switcherapi/switcher-client-deno";

// 1. Initialize the client
Client.buildContext({
  url: 'https://api.switcherapi.com',
  apiKey: '[YOUR_API_KEY]',
  domain: 'My Domain',
  component: 'MyApp',
  environment: 'default'
});

// 2. Get a switcher instance
const switcher = Client.getSwitcher('FEATURE01');

// 3. Check if a feature is enabled
const isEnabled = await switcher.isItOn();
console.log('Feature enabled:', isEnabled);
```

## Configuration
### Context Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | ✅ | Your Switcher domain name |
| `url` | string | | Switcher API endpoint |
| `apiKey` | string | | API key for your component |
| `component` | string | | Your application name |
| `environment` | string | | Environment name (default: 'default' for production) |

### Advanced Options

Configure additional features for enhanced functionality:

```ts
Client.buildContext({ 
  url, apiKey, domain, component, environment 
}, {
  local: true,                          // Enable local mode
  freeze: false,                        // Prevent background updates
  logger: true,                         // Enable request logging
  snapshotLocation: './snapshot/',      // Snapshot files directory
  snapshotAutoUpdateInterval: 30,       // Auto-update interval (seconds)
  snapshotWatcher: true,                // Monitor snapshot changes
  silentMode: '5m',                     // Fallback timeout
  restrictRelay: true,                  // Relay restrictions in local mode
  regexSafe: true,                      // Prevent reDOS attacks
  certPath: './certs/ca.pem',           // SSL certificate path
  remoteTimeout: 2000                   // Remote Criteria API timeout (milliseconds)
});
```

#### Options Reference

| Option | Type | Description |
|--------|------|-------------|
| `local` | boolean | Use only snapshot files/in-memory (no API calls) |
| `freeze` | boolean | Disable background cache updates with throttling |
| `logger` | boolean | Enable logging for debugging (`Client.getLogger('KEY')`) |
| `snapshotLocation` | string | Directory for snapshot files |
| `snapshotAutoUpdateInterval` | number | Auto-update interval in seconds (0 = disabled) |
| `snapshotWatcher` | boolean | Watch for snapshot file changes |
| `silentMode` | string | Fallback timeout (e.g., '5s', '2m', '1h') |
| `restrictRelay` | boolean | Enable relay restrictions in local mode |
| `regexSafe` | boolean | Protection against reDOS attacks |
| `regexMaxBlackList` | number | Max cached regex failures |
| `regexMaxTimeLimit` | number | Regex timeout in milliseconds |
| `certPath` | string | Path to SSL certificate file |
| `remoteTimeout` | number | Remote Criteria API timeout in milliseconds |

> **⚠️ Note on regexSafe**: This feature protects against reDOS attacks but uses Web Workers, which are incompatible with compiled executables.

## Usage Examples

### Basic Feature Flag Check

Simple on/off checks for feature flags:

```ts
// Non-persisted switcher instance
const switcher = Client.getSwitcher();
// Persisted switcher instance
const switcher = Client.getSwitcher('FEATURE01');

// 🚀 Synchronous (local mode only)
const isEnabled = switcher.isItOn();              // Returns: boolean
const isEnabledBool = switcher.isItOnBool();      // Returns: boolean
const detailResult = switcher.detail().isItOn();  // Returns: { result, reason, metadata }
const detailDirect = switcher.isItOnDetail();     // Returns: { result, reason, metadata }

// 🌐 Asynchronous (remote/hybrid mode)
const isEnabledAsync = await switcher.isItOn();               // Returns: Promise<boolean>
const isEnabledBoolAsync = await switcher.isItOnBool(true);   // Returns: Promise<boolean>
const detailResultAsync = await switcher.detail().isItOn();   // Returns: Promise<SwitcherResult>
const detailDirectAsync = await switcher.isItOnDetail(true);  // Returns: Promise<SwitcherResult>
```

### Strategy Validation with Input Preparation

Prepare context data before evaluation:

```ts
// Prepare input in advance
await switcher.checkValue('USER_1').prepare('FEATURE01');
const result = await switcher.isItOn();

// Or chain preparations
await switcher
  .checkValue('premium_user')
  .checkNetwork('192.168.1.0/24')
  .prepare('ADVANCED_FEATURE');
```

### All-in-One Execution

Complex feature flag evaluation with multiple strategies:

```ts
const result = await switcher
  .defaultResult(true)          // Fallback value if API fails
  .throttle(1000)               // Cache result for 1 second
  .checkValue('User 1')         // VALUE strategy
  .checkNetwork('192.168.0.1')  // NETWORK strategy
  .isItOn('FEATURE01');
```

### Performance Optimization with Throttling

Reduce API calls for high-frequency checks:

```ts
const switcher = Client.getSwitcher();

// Cache result for 1 second
const result = await switcher
  .throttle(1000)
  .isItOn('FEATURE01');

// Handle throttling errors
Client.subscribeNotifyError((error) => {
  console.error('Switcher error:', error);
});
```

### Hybrid Mode - Force Remote Resolution

Override local mode for specific switchers:

```ts
// Force remote resolution even in local mode
const result = await switcher
  .remote()
  .isItOn('CRITICAL_FEATURE');
```

This is useful for:
- Relay strategies requiring remote calls
- Critical features that must be resolved remotely
- Real-time configuration updates

### Flush Cached Executions for a Switcher

When using throttling, you can clear cached results for a specific switcher:

```ts
// Clear cached results for a specific switcher
Client.getSwitcher('FEATURE01').flushExecutions();
```

### Circuit Breaker: Silent Mode

This feature allows you to specify how long the client SDK should attempt to restore connectivity in case of remote API failures.

When the API is unavailable, the SDK will automatically operate in silent mode, evaluating Switchers using a local snapshot. It is important to note that any Switcher Key configured must be able to resolve without external dependencies (e.g., Switcher Relay).

Make sure to configure the scheduled snapshot auto-update to keep the local snapshot up to date with the remote API. 

Here is an example - in-memory snapshot with auto-update every 30 seconds:

```ts
Client.buildContext({ 
  url, apiKey, domain, component, environment 
}, {
  snapshotAutoUpdateInterval: 30,
  silentMode: '5m',
});
```

## Testing & Development

### Built-in Stub Feature

Mock feature flag responses for comprehensive testing:

```ts
// Simple true/false mocking
Client.assume('FEATURE01').true();
console.log(switcher.isItOn('FEATURE01')); // Always returns true

Client.assume('FEATURE01').false();
console.log(switcher.isItOn('FEATURE01')); // Always returns false

// Reset to normal behavior
Client.forget('FEATURE01');

// Mock with metadata (simulating Relay responses)
Client.assume('FEATURE01')
  .false()
  .withMetadata({ message: 'Feature disabled for maintenance' });

const response = await switcher.detail().isItOn('FEATURE01') as SwitcherResult;
console.log(response.result);           // false
console.log(response.metadata.message); // 'Feature disabled for maintenance'

// Conditional mocking based on input
Client.assume('FEATURE01').true().when(StrategiesType.VALUE, 'premium_user');
console.log(switcher.checkValue('premium_user').isItOn('FEATURE01')); // true
console.log(switcher.checkValue('basic_user').isItOn('FEATURE01'));   // false

// Mock with multiple values
Client.assume('FEATURE01').true().when(StrategiesType.NETWORK, ['192.168.1.1', '10.0.0.1']);
```

### Test Mode

Enable test mode to prevent file locking during automated testing:

```ts
// In your test setup
Client.testMode();
```

### Smoke Testing

Validate feature flag during startup to catch configuration issues early:

```ts
try {
  await Client.checkSwitchers(['FEATURE01', 'FEATURE02', 'CRITICAL_FEATURE']);
  console.log('✅ All switchers configured correctly');
} catch (error) {
  console.error('❌ Configuration issues found:', error.message);
  process.exit(1);
}
```

## Snapshot Management

Snapshots enable zero-latency local mode by caching your feature flag configuration.

### Loading Snapshots

```ts
// Load snapshot from API
const version = await Client.loadSnapshot();
console.log('Loaded snapshot version:', version);
```

### Real-time Snapshot Monitoring

#### Option 1: Programmatic Watching

```ts
Client.watchSnapshot({
  success: () => console.log('✅ Snapshot updated successfully'),
  reject: (err: Error) => console.error('❌ Snapshot update failed:', err)
});
```

#### Option 2: Configuration-based Watching

```ts
Client.buildContext({ domain, component, environment }, {
  local: true,
  snapshotLocation: './snapshot/',
  snapshotWatcher: true  // Enable automatic monitoring
});
```

### Snapshot Version Checking

Verify snapshot currency for external management:

```ts
const isLatest = Client.checkSnapshot();
console.log('Snapshot is up to date:', isLatest);
```

### Automatic Snapshot Updates

Schedule periodic updates for local mode with automatic refresh:

```ts
// Update every 3 seconds
Client.scheduleSnapshotAutoUpdate(3, {
    success: (updated) => console.log('Snapshot updated', updated),
    reject: (err: Error) => console.log(err)
});
```

# AI Disclaimer

This project's core foundation was built and maintained by a human from day one. However, we have leveraged AI tools to assist in various aspects of the development process, such as troubleshooting, code optimization, and documentation. We have thoroughly reviewed and tested all AI-generated contributions to ensure they meet our quality standards and align with our project's goals. We are committed to transparency about our use of AI and will continue to disclose any significant AI contributions in the future. 

External contributions from the community are **equally valued and will be reviewed with the same standards, regardless of whether they were assisted by AI or not**. We encourage all contributors to disclose their use of AI tools in their contributions to maintain transparency and foster trust within our community.