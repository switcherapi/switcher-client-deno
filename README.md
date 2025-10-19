# Switcher4Deno

<div align="center">
<b>Switcher4Deno</b><br>
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

## 📋 Table of Contents

- [🎯 About](#-about)
  - [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Basic Setup](#basic-setup)
- [⚙️ Configuration](#️-configuration)
  - [Context Parameters](#context-parameters)
  - [Advanced Options](#advanced-options)
  - [Options Reference](#options-reference)
- [💡 Usage Examples](#-usage-examples)
  - [1. Basic Feature Flag Check](#1-basic-feature-flag-check)
  - [2. Strategy Validation with Input Preparation](#2-strategy-validation-with-input-preparation)
  - [3. All-in-One Execution](#3-all-in-one-execution)
  - [4. Performance Optimization with Throttling](#4-performance-optimization-with-throttling)
  - [5. Hybrid Mode - Force Remote Resolution](#5-hybrid-mode---force-remote-resolution)
- [🧪 Testing & Development](#-testing--development)
  - [Built-in Stub Feature](#built-in-stub-feature)
  - [Test Mode](#test-mode)
  - [Smoke Testing](#smoke-testing)
- [📸 Snapshot Management](#-snapshot-management)
  - [Loading Snapshots](#loading-snapshots)
  - [Real-time Snapshot Monitoring](#real-time-snapshot-monitoring)
  - [Snapshot Version Checking](#snapshot-version-checking)
  - [Automatic Snapshot Updates](#automatic-snapshot-updates)

## 🎯 About

**Switcher4Deno** is a feature-rich SDK for integrating [Switcher API](https://github.com/switcherapi/switcher-api) into your Deno applications. It provides robust feature flag management with enterprise-grade capabilities.

### ✨ Key Features

- 🚀 **Zero Latency**: Local mode with snapshot files or in-memory for instant feature flag resolution
- 🔄 **Hybrid Configuration**: Silent mode with automatic fallback handling
- 🧪 **Testing Ready**: Built-in stub implementation for comprehensive testing
- ⚡ **Performance Optimized**: Throttling optimizes remote API calls to reduce bottlenecks in critical code paths
- 🛠️ **Developer Tools**: Runtime snapshot updates without app restart and automatic sync with remote API

## 🚀 Quick Start

### Prerequisites

- **Deno**: Version 1.4x or higher
- **Required Permissions**: 
  ```bash
  --allow-read --allow-write --allow-net
  ```

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

// Initialize the client context
Client.buildContext({
  url: 'https://api.switcherapi.com',
  apiKey: '[YOUR_API_KEY]',
  domain: 'My Domain',
  component: 'MyApp',
  environment: 'default'
});

// Get a switcher instance
const switcher = Client.getSwitcher();

// Check if a feature is enabled
const isEnabled = await switcher.isItOn('FEATURE01');
console.log('Feature enabled:', isEnabled);
```

## ⚙️ Configuration
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
  snapshotAutoUpdateInterval: 300,      // Auto-update interval (seconds)
  snapshotWatcher: true,                // Monitor snapshot changes
  silentMode: '5m',                     // Fallback timeout
  restrictRelay: true,                  // Relay restrictions in local mode
  regexSafe: true,                      // Prevent reDOS attacks
  certPath: './certs/ca.pem'            // SSL certificate path
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

> **⚠️ Note on regexSafe**: This feature protects against reDOS attacks but uses Web Workers, which are incompatible with compiled executables.

## 💡 Usage Examples

### 1. Basic Feature Flag Check

Simple on/off checks for feature flags:

```ts
const switcher = Client.getSwitcher();

// Synchronous (local mode only)
const isEnabled = switcher.isItOn('FEATURE01') as boolean; 
const isEnabledBool = switcher.isItOnBool('FEATURE01');
// Returns: true or false

// With detailed response
const response = switcher.detail().isItOn('FEATURE01') as SwitcherResult;
const detailedResponse = switcher.isItOnDetail('FEATURE01');
// Returns: { result: true, reason: 'Success', metadata: {} }

// Asynchronous (remote/hybrid mode)
const isEnabledAsync = await switcher.isItOn('FEATURE01');
const isEnabledBoolAsync = await switcher.isItOnBool('FEATURE01', true);
const responseAsync = await switcher.detail().isItOn('FEATURE01');
const detailedResponseAsync = await switcher.isItOnDetail('FEATURE01', true);
// Returns: Promise<boolean> or Promise<SwitcherResult>
```

### 2. Strategy Validation with Input Preparation

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

### 3. All-in-One Execution

Complex feature flag evaluation with multiple strategies:

```ts
const result = await switcher
  .defaultResult(true)          // Fallback value if API fails
  .throttle(1000)               // Cache result for 1 second
  .checkValue('User 1')         // VALUE strategy
  .checkNetwork('192.168.0.1')  // NETWORK strategy
  .isItOn('FEATURE01');
```

### 4. Performance Optimization with Throttling

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

### 5. Hybrid Mode - Force Remote Resolution

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

## 🧪 Testing & Development

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

## 📸 Snapshot Management

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
// Update every 3 seconds (3000 milliseconds)
Client.scheduleSnapshotAutoUpdate(3000, {
    success: (updated) => console.log('Snapshot updated', updated),
    reject: (err: Error) => console.log(err)
});
```