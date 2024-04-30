// Copyright 2024-present the Switcher API authors. All rights reserved. MIT license.

/**
 * Switcher Clinet SDK for working with Switcher API
 *
 * ```ts
 * import { Switcher } from '@switcherapi/switcher4deno';
 *
 * Switcher.buildContext({ url, apiKey, domain, component, environment });
 *
 * const switcher = Switcher.factory();
 * await switcher.isItOn('SWITCHER_KEY'));
 * ```
 *
 * @module
 */

export { Switcher } from './src/switcher-client.ts';
export {
  checkDate,
  checkNetwork,
  checkNumeric,
  checkPayload,
  checkRegex,
  checkTime,
  checkValue,
} from './src/lib/middlewares/check.ts';
