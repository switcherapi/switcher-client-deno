import { processOperation } from './snapshot.ts';
import { getEntry } from '../lib/remote.ts';
import * as util from '../lib/utils/index.ts';
import type { Config, Domain, Entry, Group, Snapshot, Strategy } from '../types/index.d.ts';
import type { SwitcherRequest } from '../switcherRequest.ts';
import { SwitcherResult } from './result.ts';

/**
 * Resolves the criteria for a given switcher request against the snapshot domain.
 *
 * @param {Domain} domain - The domain containing groups and configurations.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 */
function resolveCriteria(
  domain: Domain,
  switcher: SwitcherRequest,
): SwitcherResult {
  if (!domain.activated) {
    return SwitcherResult.disabled('Domain disabled');
  }

  const { group } = domain;
  return checkGroup(group, switcher);
}

/**
 * Checks if a switcher is valid within a specific group of the domain.
 *
 * @param {Group[]} groups - The list of groups to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 * @throws {Error} - If the switcher key is not found in any group.
 */
function checkGroup(
  groups: Group[],
  switcher: SwitcherRequest,
): SwitcherResult {
  const key = util.get(switcher.key, '');

  for (const group of groups) {
    const { config } = group;
    const configFound = config.find((c) => c.key === key);

    if (configFound) {
      if (!group.activated) {
        return SwitcherResult.disabled('Group disabled');
      }

      return checkConfig(configFound, switcher);
    }
  }

  throw new Error(
    `Something went wrong: {"error":"Unable to load a key ${switcher.key}"}`,
  );
}

/**
 * Checks if a switcher is valid within a specific configuration.
 *
 * @param {Config} config Configuration to check
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @return {SwitcherResult} - The result of the switcher evaluation.
 */
function checkConfig(config: Config, switcher: SwitcherRequest): SwitcherResult {
  if (!config.activated) {
    return SwitcherResult.disabled('Config disabled');
  }

  if (hasRelayEnabled(config) && switcher.isRelayRestricted) {
    return SwitcherResult.disabled('Config has Relay enabled');
  }

  if (config.strategies) {
    return checkStrategy(config, switcher.input);
  }

  return SwitcherResult.enabled();
}

/**
 * Checks if a switcher is valid against the strategies defined in the configuration.
 *
 * @param {Config} config - The configuration containing strategies.
 * @param {string[][]} [input] - The input data to be evaluated against the strategies.
 * @returns {SwitcherResult} - The result of the strategy evaluation.
 */
function checkStrategy(config: Config, input?: string[][]): SwitcherResult {
  const { strategies } = config;
  const entry = getEntry(util.get(input, []));

  for (const strategyConfig of strategies) {
    if (!strategyConfig.activated) {
      continue;
    }

    const strategyResult = checkStrategyConfig(strategyConfig, entry);
    if (strategyResult) {
      return strategyResult;
    }
  }

  return SwitcherResult.enabled();
}

/**
 * Checks if a strategy configuration is valid against the provided entry data.
 *
 * @param {Strategy} strategyConfig - The strategy configuration to be checked.
 * @param {Entry[]} [entry] - The entry data to be evaluated against the strategy.
 * @returns {SwitcherResult | undefined} - The result of the strategy evaluation or undefined if valid.
 */
function checkStrategyConfig(
  strategyConfig: Strategy,
  entry?: Entry[],
): SwitcherResult | undefined {
  if (!entry?.length) {
    return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' did not receive any input`);
  }

  const strategyEntry = entry.filter((e) => e.strategy === strategyConfig.strategy);
  if (!isStrategyFulfilled(strategyEntry, strategyConfig)) {
    return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' does not agree`);
  }

  return undefined;
}

function hasRelayEnabled(config: Config) {
  return config.relay?.activated;
}

function isStrategyFulfilled(strategyEntry: Entry[], strategyConfig: Strategy) {
  return strategyEntry.length > 0 && processOperation(strategyConfig, strategyEntry[0].input);
}

/**
 * Checks the criteria for a switcher request against the local snapshot.
 *
 * @param {Snapshot | undefined} snapshot - The snapshot containing the domain to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {SwitcherResult} - The result of the switcher evaluation.
 * @throws {Error} - If the snapshot is not loaded.
 */
export default function checkCriteriaLocal(
  snapshot: Snapshot | undefined,
  switcher: SwitcherRequest,
): SwitcherResult {
  if (!snapshot) {
    throw new Error(
      "Snapshot not loaded. Try to use 'Client.loadSnapshot()'",
    );
  }

  const { domain } = snapshot;
  return resolveCriteria(domain, switcher);
}
