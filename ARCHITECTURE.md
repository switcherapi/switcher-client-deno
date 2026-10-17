# Architecture

This document describes the design of the **Switcher Client Deno SDK**, from the public API surface down to
internal modules, data flow, and design patterns. It complements the [README](./README.md), which focuses on
usage; this document focuses on *how* the SDK is built and *why*.

## Table of Contents

- [1. Design Goals](#1-design-goals)
- [2. API-First View](#2-api-first-view)
  - [2.1 `Client` — entry point / facade](#21-client--entry-point--facade)
  - [2.2 `Switcher` — the fluent execution unit](#22-switcher--the-fluent-execution-unit)
  - [2.3 Public types](#23-public-types)
- [3. Execution Modes](#3-execution-modes)
- [4. High-Level Architecture](#4-high-level-architecture)
- [5. Module Structure](#5-module-structure)
- [6. Core Flows](#6-core-flows)
  - [6.1 Bootstrapping (`buildContext`)](#61-bootstrapping-buildcontext)
  - [6.2 Criteria Evaluation (`isItOn`)](#62-criteria-evaluation-isiton)
  - [6.3 Snapshot Loading & Watching](#63-snapshot-loading--watching)
  - [6.4 Authentication Lifecycle](#64-authentication-lifecycle)
  - [6.5 Silent Mode (Circuit Breaker)](#65-silent-mode-circuit-breaker)
  - [6.6 Throttling & Background Refresh](#66-throttling--background-refresh)
- [7. Software Design Patterns](#7-software-design-patterns)
- [8. Strategy Resolution Engine](#8-strategy-resolution-engine)
- [9. State Management](#9-state-management)
- [10. Error Handling](#10-error-handling)
- [11. Testing Support](#11-testing-support)
- [12. Concurrency Model](#12-concurrency-model)
- [13. Extensibility Points](#13-extensibility-points)

## 1. Design Goals

- **Zero-latency evaluation**: feature flag checks must be resolvable synchronously from an in-memory/local
  snapshot, with no network round-trip on the hot path.
- **Hybrid resilience**: seamlessly blend local (snapshot) and remote (API) evaluation, degrading gracefully
  from remote to local when the API is unreachable (silent mode / circuit breaker).
- **Fluent, chainable API**: criteria (strategy inputs, throttling, defaults, detail mode) are composed via a
  builder before execution.
- **Deno-idiomatic**: relies on Deno's runtime APIs directly (`Deno.readTextFileSync`, `Deno.watchFs`,
  `Deno.createHttpClient`, Web Workers) instead of Node-style abstractions; a single external dependency
  (`jsr:@std/fs`) is declared in `src/deps.ts`.
- **Testability first**: stubbing (`Client.assume`/`forget`), a `testMode()` switch, and an execution logger
  are first-class citizens, not afterthoughts.
- **Safety**: protects against catastrophic regex backtracking (ReDoS) via an optional Worker-isolated,
  time-boxed regex matcher.

## 2. API-First View

The public surface, re-exported from `mod.ts`, is intentionally small:

```ts
export { Switcher, type SwitcherExecutionResult } from './src/switcher.ts';
export { Client } from './src/client.ts';
export { SwitcherResult } from './src/lib/result.ts';
export { StrategiesType } from './src/lib/snapshot.ts';
export type { SwitcherContext, SwitcherOptions } from './src/types/index.d.ts';
```

Everything under `src/lib/**` is an implementation detail, hidden from consumers, and reachable only through
`Client` and `Switcher`.

### 2.1 `Client` — entry point / facade

`Client` (`src/client.ts`) is a **static facade** that owns all process-wide state and coordinates the SDK
subsystems. It never performs criteria evaluation itself — it delegates that to `Switcher` instances. Its
responsibilities:

| Concern | Methods |
|---|---|
| Context/config bootstrap | `buildContext(context, options)` |
| Switcher factory (with instance caching) | `getSwitcher(key?)` |
| Snapshot lifecycle | `loadSnapshot()`, `checkSnapshot()`, `unloadSnapshot()`, `watchSnapshot()`, `scheduleSnapshotAutoUpdate()`, `terminateSnapshotAutoUpdate()`, `snapshotVersion` |
| Smoke testing | `checkSwitchers(keys)` |
| Test stubbing | `assume(key)`, `forget(key)` |
| Observability | `subscribeNotifyError()`, `getLogger()`, `getExecution()`, `clearLogger()` |
| Test infrastructure | `testMode()` |

### 2.2 `Switcher` — the fluent execution unit

`Switcher` (`src/switcher.ts`) extends `SwitcherBuilder` (`src/switcherBuilder.ts`) and implements the
`SwitcherRequest` interface (`src/switcherRequest.ts`). This separation splits **configuration** (builder)
from **execution** (switcher):

- `SwitcherBuilder` — a fluent, chainable configuration surface: `checkValue()`, `checkNetwork()`,
  `checkNumeric()`, `checkDate()`, `checkTime()`, `checkRegex()`, `checkPayload()`, `throttle()`, `remote()`,
  `detail()`, `defaultResult()`, `restrictRelay()`, `resetInputs()`. Every method returns `this`, enabling
  chains like `switcher.checkValue('x').throttle(1000).isItOn('KEY')`.
- `Switcher` — adds execution semantics: `isItOn()`, `isItOnBool()`, `isItOnDetail()`, `prepare()`,
  `validate()`, `executeLocalCriteria()`, `executeRemoteCriteria()`, `flushExecutions()`.
- `SwitcherRequest` — a minimal read-only interface (`key`, `input`, `isRelayRestricted`) that decouples the
  strategy resolver (`resolver.ts`) from the concrete `Switcher` class, so criteria evaluation only depends on
  data, not on builder/execution behavior (Interface Segregation).

`isItOnBool`/`isItOnDetail` are overloaded to support both synchronous (local mode) and asynchronous (remote
or `forceAsync`) call shapes with the same method name, returning `boolean | Promise<boolean>` or
`SwitcherResult | Promise<SwitcherResult>` respectively.

### 2.3 Public types

`src/types/index.d.ts` defines two categories of types:

- **Client SDK settings**: `SwitcherContext`, `SwitcherOptions`, `RetryOptions`, `LoadSnapshotOptions`.
- **Switcher API domain model**: `Snapshot`, `Domain`, `Group`, `Config`, `Strategy`, `Entry`, `Relay`,
  `AuthResponse`, `CheckSnapshotVersionResponse` — a direct mapping of the GraphQL/REST schema exposed by
  Switcher API, used identically whether the snapshot came from a file or the network.

## 3. Execution Modes

The SDK supports several evaluation modes, all governed by `GlobalOptions` and per-switcher builder flags:

| Mode | Trigger | Behavior |
|---|---|---|
| **Remote** | `local: false` (default) | Every `isItOn()` call authenticates and evaluates criteria against the Switcher API. |
| **Local** | `local: true` | Criteria is resolved against an in-memory/file snapshot; no network call; can execute synchronously. |
| **Hybrid (force remote)** | `local: true` + `switcher.remote()` | A single switcher instance opts out of local mode (e.g., for Relay-dependent switchers) while the rest of the app stays local. |
| **Silent Mode (circuit breaker)** | `silentMode` option, remote call fails | Falls back to the local snapshot for a bounded time window, then retries remote. |
| **Stubbed** | `Client.assume(key)` | Bypasses both local and remote resolution entirely, returning a forced result — used for testing. |

## 4. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Consumer Application                         │
└───────────────────────────────────────────────────────────────────────────┘
                 │                                          │
                 ▼                                          ▼
       ┌───────────────────┐                      ┌───────────────────────┐
       │      Client        │  (facade / static)   │       Switcher         │
       │ buildContext()      │◄────getSwitcher()───│ (SwitcherBuilder +     │
       │ loadSnapshot()      │                      │  execution methods)   │
       │ assume()/forget()   │                      └──────────┬────────────┘
       └─────────┬───────────┘                                 │
                 │ configures                                  │ isItOn()
                 ▼                                              ▼
     ┌─────────────────────────┐                    ┌────────────────────────┐
     │   Global State Layer     │                    │   Decision Pipeline     │
     │ GlobalOptions            │◄──────read/write────│ 1. Bypasser (stub)     │
     │ GlobalSnapshot            │                    │ 2. Execution cache     │
     │ GlobalAuth                │                    │    (throttle)          │
     └─────────┬────────┬────────┘                    │ 3. Local resolver OR   │
               │        │                              │    Remote API call    │
               │        │                              └───────────┬────────────┘
               │        │                                          │
               ▼        ▼                                          ▼
  ┌────────────────┐ ┌────────────────────┐            ┌────────────────────────┐
  │ snapshot.ts     │ │ remoteAuth.ts (Auth)│            │ resolver.ts             │
  │ (load/validate  │ │ remote.ts (fetch)   │            │ (domain → group →      │
  │  local snapshot)│ │                     │            │  config → strategy)    │
  └────────────────┘ └────────────────────┘            └────────────────────────┘
               │                                                    │
               ▼                                                    ▼
     Snapshot JSON file / in-memory                    utils/ (DateMoment, IPCIDR,
     (watched via Deno.watchFs)                        TimedMatch, payloadReader)
```

## 5. Module Structure

```
mod.ts                              Public entry point (re-exports)
src/
├── client.ts                       Client facade (static class, process-wide orchestration)
├── switcher.ts                     Switcher (execution: isItOn, isItOnBool, isItOnDetail, prepare, validate)
├── switcherBuilder.ts              SwitcherBuilder (fluent configuration: check*, throttle, remote, detail...)
├── switcherRequest.ts              SwitcherRequest interface (key, input, isRelayRestricted)
├── deps.ts                         Centralized third-party imports (jsr:@std/fs)
├── types/
│   └── index.d.ts                  SwitcherContext/Options + Switcher API domain model types
└── lib/
    ├── constants.ts                Default option values + SWITCHER_OPTIONS enum
    ├── result.ts                   SwitcherResult value object (result/reason/metadata)
    ├── resolver.ts                 Local criteria resolution engine (domain→group→config→strategy)
    ├── snapshot.ts                 Snapshot loading, validation, StrategiesType/OperationsType, operation processors
    ├── snapshotWatcher.ts          Deno.watchFs-based file watcher with debouncing
    ├── remote.ts                   Switcher API HTTP client (fetch-based: auth, criteria, snapshot, health)
    ├── remoteAuth.ts               Auth — token lifecycle, auto-refresh scheduling, silent-mode token
    ├── globals/
    │   ├── globalOptions.ts        Process-wide SwitcherOptions singleton
    │   ├── globalSnapshot.ts       Process-wide loaded Snapshot singleton
    │   └── globalAuth.ts           Process-wide auth token/exp/url singleton
    ├── bypasser/
    │   ├── index.ts                Bypasser — stub registry (assume/forget/searchBypassed)
    │   ├── key.ts                  Key — forced true/false result + optional conditional criteria
    │   └── criteria.ts             Criteria — "when" conditions for conditional stubbing
    ├── exceptions/
    │   └── index.ts               ClientError, RemoteError, CheckSwitcherError
    └── utils/
        ├── index.ts               get() null-coalescing helper
        ├── datemoment.ts          DateMoment — date/time comparison helper (TIME/DATE strategies)
        ├── ipcidr.ts              IPCIDR — CIDR range matching (NETWORK strategy)
        ├── payloadReader.ts       Recursive JSON key-path extractor (PAYLOAD strategy)
        ├── executionLogger.ts     ExecutionLogger — throttle cache + observability log + error pub/sub
        ├── snapshotAutoUpdater.ts SnapshotAutoUpdater — setInterval-based periodic snapshot refresh
        └── timed-match/
            ├── index.ts           TimedMatch — Worker-isolated, time-boxed regex matching + blacklist
            ├── match.ts           Plain (non-worker) regex matching fallback
            └── worker.ts          Web Worker entry point running match.ts in isolation
```

## 6. Core Flows

### 6.1 Bootstrapping (`buildContext`)

`Client.buildContext(context, options)`:

1. Stores `context` (domain/url/apiKey/component/environment), defaults `environment` to `'default'`.
2. Resets `GlobalSnapshot` and initializes `GlobalOptions` with defaults from `constants.ts`.
3. Initializes `Auth` (and transitively `GlobalAuth`) with the context URL.
4. Iterates a **handler map** (`SWITCHER_OPTIONS` enum → setup function) to apply only the options the caller
   actually provided — certs, silent mode, remote timeout, restrict relay, snapshot auto-update, snapshot
   watcher, auto-refresh-token — then configures the regex-safe `TimedMatch` worker.

This "handler map keyed by enum" pattern (see `buildOptions`) keeps option wiring declarative and avoids a
long `if/else` chain; adding a new option means adding one enum value + one handler entry.

### 6.2 Criteria Evaluation (`isItOn`)

`Switcher.isItOn(key?)` runs a short-circuiting decision pipeline:

1. **Validate args** — apply key override if passed.
2. **Bypasser check** — if `Client.assume(key)` registered a stub for this key, return its forced/conditional
   result immediately (`Bypasser.searchBypassed`).
3. **Cached result check** — if `throttle()` was set and a cached result exists in `ExecutionLogger`, return
   it synchronously; optionally schedule a non-blocking background refresh (`scheduleBackgroundRefresh`).
4. **Submit** (`_submit`) — the real decision:
   - If `GlobalOptions.local` is true and `remote()` wasn't forced → `executeLocalCriteria()` (synchronous).
   - Otherwise → `validate()` (ensures auth/token), then either `executeLocalCriteria()` (if the auth token
     is the sentinel `'SILENT'` value, i.e., circuit breaker engaged) or `executeRemoteCriteria()` (async
     fetch to the API). Errors trigger `_notifyError` and, if `silentMode` is configured, fall back to local
     evaluation via `Auth.updateSilentToken()`.

`executeLocalCriteria()` delegates to `resolver.ts#checkCriteriaLocal`, a pure function walking
`Snapshot.domain → group → config → strategy`. `executeRemoteCriteria()` calls `remote.ts#checkCriteria`
(POST `/criteria`). Both paths converge on a `SwitcherResult`, optionally logged via `ExecutionLogger`, and
transformed to `boolean` or `SwitcherResult` depending on `detail()`.

### 6.3 Snapshot Loading & Watching

- `Client.loadSnapshot(options)` reads the local snapshot file (or a stub `{domain:{version:0}}` if absent)
  via `snapshot.ts#loadDomain`, stores it in `GlobalSnapshot`, and — if the version is `0` and either
  `fetchRemote` is requested or the client isn't in `local` mode — immediately calls `checkSnapshot()` to pull
  a fresh copy from the API.
- `Client.checkSnapshot()` compares versions via `remote.ts#checkSnapshotVersion`; if outdated, fetches the
  full domain graph via GraphQL (`remote.ts#resolveSnapshot`), persists it to disk (if `snapshotLocation` is
  set) and updates `GlobalSnapshot`.
- `Client.watchSnapshot()`/`SnapshotWatcher` uses `Deno.watchFs` with a 20ms debounce map (keyed by
  serialized event) to avoid duplicate reloads from OS-level duplicate file events, reloading
  `GlobalSnapshot` on every `modify` event.
- `Client.scheduleSnapshotAutoUpdate(interval)` wraps `checkSnapshot` in a `setInterval` loop
  (`SnapshotAutoUpdater`), independent of file watching — useful for in-memory-only deployments with no
  filesystem access.

### 6.4 Authentication Lifecycle

`Auth` (`remoteAuth.ts`) is a static class owning the token lifecycle:

- `Auth.auth()` calls the API's `/criteria/auth` endpoint, stores `token`/`exp` in `GlobalAuth`, and — if
  `autoRefreshToken` is enabled — schedules a `setTimeout` 5 seconds before expiry (`scheduleNextAuth`) to
  transparently refresh the token in the background, indefinitely, until `terminateAutoRefresh()` is called
  or a refresh fails.
- `Auth.checkHealth()` is invoked before every remote validation; if the current token is the `'SILENT'`
  sentinel and its (extended) expiry has passed, it pings `/check` and re-authenticates if the API is back up
  — this is how the SDK recovers from silent mode automatically.

### 6.5 Silent Mode (Circuit Breaker)

When `silentMode` (e.g. `'5m'`) is configured:

1. Any remote call failure triggers `Auth.updateSilentToken()`, which sets `GlobalAuth.token = 'SILENT'` and
   `exp` to "now + retryTime" (parsed from the `silentMode` string via `DateMoment.add`).
2. While the token is `'SILENT'` and unexpired, `Switcher._submit()` routes every call to
   `executeLocalCriteria()` instead of the network — the app keeps functioning off the last known-good
   snapshot.
3. Once expired, `Auth.checkHealth()` probes the API and, if healthy, re-authenticates, resuming remote mode.

This is a textbook **circuit breaker** implemented without third-party dependencies, relying purely on
`GlobalAuth`'s sentinel token value as the "open" state marker.

### 6.6 Throttling & Background Refresh

`switcher.throttle(delay)` sets `_delay` and computes `_nextRefreshTime`. On subsequent `isItOn()` calls
within the delay window, `_tryCachedResult()` serves the last `ExecutionLogger` entry synchronously instead
of hitting the network, while optionally firing a non-blocking `queueMicrotask` to refresh the cache in the
background (`scheduleBackgroundRefresh`) — unless `freeze: true` disables background updates. This trades
eventual consistency for reduced remote latency in hot paths, a common pattern for high-frequency
flag checks. Enabling `throttle()` implicitly turns on `logger`, since the cache is backed by
`ExecutionLogger`.

This is a **Stale-While-Revalidate (SWR)** strategy: the caller always receives an immediate response built
from the last known-good (possibly stale) cached result, while a revalidation request is dispatched
asynchronously in the background to refresh that cache for the *next* call. Concretely:

- **Stale read** — `_tryCachedResult()` returns the cached `ExecutionLogger` entry unconditionally once it
  exists, regardless of how close `_nextRefreshTime` is; the SDK never blocks the caller waiting on a
  revalidation.
- **Revalidate** — `scheduleBackgroundRefresh()` only fires the revalidation (`_submit()` → remote/local
  criteria execution) once per throttle window (guarded by `now > this._nextRefreshTime`), and updates
  `ExecutionLogger`/`_nextRefreshTime` as a side effect for subsequent calls to pick up.
- **Opt-out** — `freeze: true` disables the revalidation leg entirely, turning the cache into a plain
  static/pinned value (stale forever, until process restart or `flushExecutions()`), which is useful when
  background network activity must be avoided.
- **Error isolation** — revalidation runs detached (`queueMicrotask`) from the caller's execution path;
  failures are routed to `_notifyError`/`Client.subscribeNotifyError` instead of rejecting the in-flight
  `isItOn()` call, so a failed revalidation never degrades the current (stale) response.

## 7. Software Design Patterns

| Pattern | Where | Purpose |
|---|---|---|
| **Facade** | `Client` | Single static entry point hiding snapshot, auth, remote, and stub subsystems. |
| **Builder / Fluent interface** | `SwitcherBuilder` | Chainable criteria configuration (`checkValue().checkNetwork().throttle()`) before execution. |
| **Singleton (module-level static state)** | `GlobalOptions`, `GlobalSnapshot`, `GlobalAuth`, `Bypasser`, `ExecutionLogger`, `Auth` | Process-wide shared configuration/state accessible without dependency injection, matching the SDK's "configure once, use anywhere" usage model. |
| **Strategy** | `resolver.ts` + `snapshot.ts` operation processors (`processVALUE`, `processNETWORK`, `processREGEX`, ...) keyed by `StrategiesType`/`OperationsType` | Each validation strategy is an interchangeable evaluation algorithm selected at runtime by config data. |
| **Template/Pipeline (chain of responsibility-like)** | `Switcher.isItOn()` → bypass → cache → local/remote | Ordered short-circuiting checks, each capable of resolving the result and stopping the chain. |
| **Circuit Breaker** | `Auth` + `GlobalAuth` (silent mode) | Automatic fallback to local snapshot on repeated remote failures, with timed self-healing. |
| **Stale-While-Revalidate (SWR)** | `Switcher._tryCachedResult()` + `scheduleBackgroundRefresh()` (throttle) | Serve cached (stale) result instantly, refresh it asynchronously in the background for subsequent calls. |
| **Interface Segregation** | `SwitcherRequest` | Decouples the resolver from the full `Switcher`/`SwitcherBuilder` API surface; the resolver depends only on `key`, `input`, `isRelayRestricted`. |
| **Value Object** | `SwitcherResult` | Immutable result carrying `result`/`reason`/`metadata`, with named constructors (`enabled()`, `disabled()`, `create()`). |
| **Decorator-ish overload dispatch** | `isItOnBool`/`isItOnDetail` overload signatures in `switcher.ts` | Same method name serves sync and async call shapes based on argument types. |
| **Handler map / dispatch table** | `Client.buildOptions` (`optionsHandler` record keyed by `SWITCHER_OPTIONS`), `snapshot.ts#processOperation` (switch keyed by `StrategiesType`) | Declarative, extensible dispatch instead of long conditionals. |

## 8. Strategy Resolution Engine

`resolver.ts` walks the snapshot hierarchy top-down, short-circuiting as soon as a disabling condition is
found:

```
resolveCriteria(domain)
  └─ domain.activated? ──false──► "Domain disabled"
  └─ checkGroup(groups)
       └─ find group containing config.key === switcher.key
       └─ group.activated? ──false──► "Group disabled"
       └─ checkConfig(config)
            └─ config.activated? ──false──► "Config disabled"
            └─ Relay activated + isRelayRestricted? ──true──► "Config has Relay enabled" (disabled)
            └─ has strategies? ──► checkStrategy(config, input)
                 └─ for each activated strategy: checkStrategyConfig
                      └─ no matching input? ──► disabled("did not receive any input")
                      └─ processOperation(strategy, input) false? ──► disabled("does not agree")
            └─ otherwise ──► enabled()
```

`snapshot.ts` defines the two enums that drive this engine — `StrategiesType` (`VALUE`, `NUMERIC`,
`NETWORK`, `TIME`, `DATE`, `REGEX`, `PAYLOAD`) and `OperationsType` (`EQUAL`, `NOT_EQUAL`, `EXIST`,
`NOT_EXIST`, `GREATER`, `LOWER`, `BETWEEN`, `HAS_ONE`, `HAS_ALL`) — plus one processor function per strategy
(`processVALUE`, `processNETWORK`, `processNUMERIC`, `processTIME`, `processDATE`, `processREGEX`,
`processPAYLOAD`), each interpreting `operation` against the config's `values` and the caller's `input`.
Specialized helpers back the more complex strategies:

- **NETWORK** → `utils/ipcidr.ts` (`IPCIDR`) for CIDR range containment.
- **TIME/DATE** → `utils/datemoment.ts` (`DateMoment`) for date/time comparisons and range checks.
- **REGEX** → `utils/timed-match/` (`TimedMatch`) for ReDoS-safe pattern matching, optionally isolated in a
  Web Worker with a `SharedArrayBuffer`+`Atomics.wait` handshake and a temporary blacklist for patterns that
  previously timed out.
- **PAYLOAD** → `utils/payloadReader.ts`, which recursively flattens a JSON payload into dotted key paths
  (`a.b.c`) for `HAS_ONE`/`HAS_ALL` checks.

## 9. State Management

The SDK deliberately centralizes mutable, process-wide state in three narrow "Global*" singletons rather than
threading configuration through every call:

- **`GlobalOptions`** — the resolved `SwitcherOptions` (local/freeze/logger/silentMode/etc.), read by nearly
  every subsystem to decide behavior.
- **`GlobalSnapshot`** — the currently loaded `Snapshot` (domain graph), read by the resolver and written by
  `snapshot.ts`/`SnapshotWatcher`/`SnapshotAutoUpdater`.
- **`GlobalAuth`** — the current auth `token`, `exp`, and API `url`, read/written by `Auth` and `remote.ts`.

Per-switcher instance state (key, strategy inputs, throttle delay, force-remote flag, detail flag, default
result) lives on the `Switcher`/`SwitcherBuilder` instance itself, and `Client._switchers` (a `Map<string,
Switcher>`) caches instances by key so repeated `Client.getSwitcher('KEY')` calls reuse configuration
(e.g., an established throttle or checkValue chain) rather than rebuilding it.

## 10. Error Handling

A small exception hierarchy (`lib/exceptions/index.ts`) distinguishes SDK-originated errors from generic
errors:

- `ClientError` — base class; prefixes messages with `"Something went wrong: "`.
- `RemoteError extends ClientError` — thrown by `remote.ts` for non-200 HTTP responses or network failures.
- `CheckSwitcherError extends ClientError` — thrown when `checkSwitchers()`/smoke testing finds unconfigured
  keys, carrying the list of missing switcher keys in its message.

`remote.ts#errorHandler` normalizes any thrown value into a `RemoteError` unless it's already a
`ClientError`, so callers can reliably `catch` a `ClientError` to distinguish SDK failures from application
logic errors. `Switcher._getDefaultResultOrThrow` gives callers an escape hatch: if `defaultResult()` was
configured, evaluation errors are swallowed and replaced with the configured fallback (plus an error
notification via `ExecutionLogger.notifyError`); otherwise the error propagates.

## 11. Testing Support

- **Stubbing** — `Bypasser`/`Key`/`Criteria` let tests force a switcher's result (`Client.assume(key).true()`
  / `.false()`), optionally conditioned on strategy input (`.when(StrategiesType.VALUE, 'x')`) or carrying
  fake Relay-style `metadata`. `Client.forget(key)` reverts to normal resolution.
- **Test mode** — `Client.testMode()` disables filesystem-watching side effects (`watchSnapshot`,
  `unloadSnapshot`) that would otherwise hold the Deno test process open or lock files during automated runs.
- **Execution logging / observability** — `ExecutionLogger` doubles as the throttle cache and as an
  inspectable execution history (`Client.getLogger(key)`, `Client.getExecution(switcher)`), plus an
  error-notification pub/sub (`Client.subscribeNotifyError`) for surfacing async failures (throttled
  background refresh, silent-mode fallback) that would otherwise be swallowed.
- **Smoke testing** — `Client.checkSwitchers(keys)` validates that a set of switcher keys exist (locally or
  remotely, falling back to local under silent mode) — intended for start-up configuration validation.

## 12. Concurrency Model

Deno's single-threaded event loop governs most of the SDK; the two exceptions are:

- **Web Worker for regex matching** (`TimedMatch`) — runs pattern matching off the main thread with a
  `SharedArrayBuffer`/`Atomics.wait` handshake, enabling a *synchronous-looking* API (`tryMatch`) while
  bounding execution time (`maxTimeLimit`, default 3000ms) and protecting the main thread from a catastrophic
  regex. Not compatible with compiled Deno executables (documented limitation).
- **`Deno.watchFs`** async iterator (`SnapshotWatcher`) — runs on a background task, debounced via
  `setTimeout` per unique file event to coalesce rapid successive OS notifications into a single reload.

Background snapshot auto-update (`SnapshotAutoUpdater`) and token auto-refresh (`Auth.scheduleNextAuth`) use
`setInterval`/`setTimeout` respectively, both cleanly cancellable (`terminate()`/`terminateAutoRefresh()`) to
avoid leaking timers across `buildContext()` re-initializations or test runs.

## 13. Extensibility Points

- **New strategy type**: add a `StrategiesType` entry (`snapshot.ts`), a `process<STRATEGY>` function, wire it
  into `processOperation`'s switch, and expose a `check<Strategy>()` convenience method on `SwitcherBuilder`.
- **New client option**: add a `SWITCHER_OPTIONS` enum value, a field on `SwitcherOptions`
  (`types/index.d.ts`), and a handler entry in `Client.buildOptions`'s `optionsHandler` map.
- **New remote endpoint**: add a function to `remote.ts` following the existing `fetch` + `errorHandler` +
  typed-response convention, backed by `GlobalAuth.url`/`GlobalAuth.token`.
- **Alternative snapshot source**: `snapshot.ts#loadDomain` and `GlobalSnapshot` are the only integration
  points the rest of the SDK depends on — both take/return plain `Snapshot` JSON, decoupled from *how* it was
  obtained (file, network, or hand-crafted for tests).
