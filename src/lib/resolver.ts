import { processOperation } from './snapshot.ts';
import { getEntry } from '../lib/remote.ts';
import * as util from '../lib/utils/index.ts';
import type { Config, Entry, Group, Snapshot, SnapshotData, Strategy } from '../types/index.d.ts';
import type { Switcher } from '../switcher.ts';

async function resolveCriteria(
  data: SnapshotData,
  switcher: Switcher,
) {
  let result = true, reason = '';

  try {
    if (!data.domain.activated) {
      throw new CriteriaFailed('Domain disabled');
    }

    const { group } = data.domain;
    if (!(await checkGroup(group, switcher))) {
      throw new Error(
        `Something went wrong: {"error":"Unable to load a key ${switcher.key}"}`,
      );
    }

    reason = 'Success';
  } catch (e) {
    if (e instanceof CriteriaFailed) {
      result = false;
      reason = e.message;
    } else {
      throw e;
    }
  }

  return {
    result,
    reason,
  };
}

/**
 * @param {*} groups from a specific Domain
 * @param {*} switcher Switcher to check
 * @return true if Switcher found
 */
async function checkGroup(
  groups: Group[],
  switcher: Switcher,
) {
  const key = util.get(switcher.key, '');

  if (groups) {
    for (const group of groups) {
      const { config } = group;
      const configFound = config.filter((c: { key: string }) => c.key === key);

      // Switcher Configs are always supplied as the snapshot is loaded from components linked to the Switcher.
      if (await checkConfig(group, configFound[0], switcher)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {*} group in which Switcher has been found
 * @param {*} config Switcher found
 * @param {*} switcher Switcher to check
 * @return true if Switcher found
 */
async function checkConfig(group: Group, config: Config, switcher: Switcher) {
  if (!config) {
    return false;
  }

  if (!group.activated) {
    throw new CriteriaFailed('Group disabled');
  }

  if (!config.activated) {
    throw new CriteriaFailed('Config disabled');
  }

  if (hasRelayEnabled(config) && switcher.isRelayRestricted) {
    throw new CriteriaFailed('Config has Relay enabled');
  }

  if (config.strategies) {
    return await checkStrategy(config, util.get(switcher.input, []));
  }

  return true;
}

async function checkStrategy(config: Config, input?: string[][]) {
  const { strategies } = config;
  const entry = getEntry(input);

  for (const strategy of strategies) {
    if (!strategy.activated) {
      continue;
    }

    await checkStrategyInput(strategy, entry);
  }

  return true;
}

async function checkStrategyInput(strategyInput: Strategy, entry?: Entry[]) {
  if (entry?.length) {
    const strategyEntry = entry.filter((e) => e.strategy === strategyInput.strategy);
    if (
      strategyEntry.length == 0 ||
      !(await processOperation(
        strategyInput.strategy,
        strategyInput.operation,
        strategyEntry[0].input,
        strategyInput.values,
      ))
    ) {
      throw new CriteriaFailed(
        `Strategy '${strategyInput.strategy}' does not agree`,
      );
    }
  } else {
    throw new CriteriaFailed(
      `Strategy '${strategyInput.strategy}' did not receive any input`,
    );
  }
}

function hasRelayEnabled(config: Config): boolean {
  return config.relay?.activated;
}

export default async function checkCriteriaLocal(
  snapshot: Snapshot | undefined,
  switcher: Switcher,
) {
  if (!snapshot) {
    throw new Error(
      "Snapshot not loaded. Try to use 'Client.loadSnapshot()'",
    );
  }

  const { data } = snapshot;
  return await resolveCriteria(data, switcher);
}

class CriteriaFailed extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = this.constructor.name;
  }
}
