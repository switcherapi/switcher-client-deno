import { processOperation } from './snapshot.ts';
import { getEntry } from '../lib/remote.ts';
import * as util from '../lib/utils/index.ts';
import type { Config, Entry, Group, Snapshot, SnapshotData, Strategy } from '../types/index.d.ts';
import type { SwitcherRequest } from '../switcherRequest.ts';
import { SwitcherResult } from './result.ts';

/**
 * Resolves the criteria for a given switcher request against the snapshot data.
 *
 * @param {SnapshotData} data - The snapshot data containing domain and group information.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {Promise<SwitcherResult>} - The result of the switcher evaluation.
 */
async function resolveCriteria(
  data: SnapshotData,
  switcher: SwitcherRequest,
): Promise<SwitcherResult> {
  if (!data.domain.activated) {
    return SwitcherResult.disabled('Domain disabled');
  }

  const { group } = data.domain;
  return await checkGroup(group, switcher);
}

/**
 * Checks if a switcher is valid within a specific group of the domain.
 *
 * @param {Group[]} groups - The list of groups to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {Promise<SwitcherResult>} - The result of the switcher evaluation.
 * @throws {Error} - If the switcher key is not found in any group.
 */
async function checkGroup(
  groups: Group[],
  switcher: SwitcherRequest,
): Promise<SwitcherResult> {
  const key = util.get(switcher.key, '');

  for (const group of groups) {
    const { config } = group;
    const configFound = config.filter((c: { key: string }) => c.key === key);

    if (configFound.length) {
      if (!group.activated) {
        return SwitcherResult.disabled('Group disabled');
      }

      return await checkConfig(configFound[0], switcher);
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
 * @return {Promise<SwitcherResult>} - The result of the switcher evaluation.
 */
async function checkConfig(config: Config, switcher: SwitcherRequest): Promise<SwitcherResult> {
  if (!config.activated) {
    return SwitcherResult.disabled('Config disabled');
  }

  if (hasRelayEnabled(config) && switcher.isRelayRestricted) {
    return SwitcherResult.disabled('Config has Relay enabled');
  }

  if (config.strategies) {
    return await checkStrategy(config, switcher.input);
  }

  return SwitcherResult.enabled();
}

/**
 * Checks if a switcher is valid against the strategies defined in the configuration.
 *
 * @param {Config} config - The configuration containing strategies.
 * @param {string[][]} [input] - The input data to be evaluated against the strategies.
 * @returns {Promise<SwitcherResult>} - The result of the strategy evaluation.
 */
async function checkStrategy(config: Config, input?: string[][]): Promise<SwitcherResult> {
  const { strategies } = config;
  const entry = getEntry(util.get(input, []));

  for (const strategyConfig of strategies) {
    if (!strategyConfig.activated) {
      continue;
    }

    const strategyResult = await checkStrategyConfig(strategyConfig, entry);
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
 * @returns {Promise<SwitcherResult | undefined>} - The result of the strategy evaluation or undefined if valid.
 */
async function checkStrategyConfig(strategyConfig: Strategy, entry?: Entry[]): Promise<SwitcherResult | undefined> {
  if (!entry?.length) {
    return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' did not receive any input`);
  }

  const strategyEntry = entry.filter((e) => e.strategy === strategyConfig.strategy);
  if (await isStrategyFulfilled(strategyEntry, strategyConfig)) {
    return SwitcherResult.disabled(`Strategy '${strategyConfig.strategy}' does not agree`);
  }

  return undefined;
}

function hasRelayEnabled(config: Config) {
  return config.relay?.activated;
}

async function isStrategyFulfilled(strategyEntry: Entry[], strategyConfig: Strategy) {
  return strategyEntry.length == 0 ||
    !(await processOperation(strategyConfig, strategyEntry[0].input));
}

/**
 * Checks the criteria for a switcher request against the local snapshot.
 *
 * @param {Snapshot | undefined} snapshot - The snapshot containing the data to check against.
 * @param {SwitcherRequest} switcher - The switcher request to be evaluated.
 * @returns {Promise<SwitcherResult>} - The result of the switcher evaluation.
 * @throws {Error} - If the snapshot is not loaded.
 */
export default async function checkCriteriaLocal(
  snapshot: Snapshot | undefined,
  switcher: SwitcherRequest,
): Promise<SwitcherResult> {
  if (!snapshot) {
    throw new Error(
      "Snapshot not loaded. Try to use 'Client.loadSnapshot()'",
    );
  }

  const { data } = snapshot;
  return await resolveCriteria(data, switcher);
}
