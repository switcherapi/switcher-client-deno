export {};

// Client SDK settings types

/**
 * SwitcherContext is used to build the context
 * 
 * @param domain - The domain name of the Switcher API account
 * @param url - The API URL, e.g. https://api.switcherapi.com
 * @param apiKey - The API key provided for the component
 * @param component - The component name registered in the Switcher API account
 * @param environment - The environment name registered in the Switcher API account
 */
export type SwitcherContext = {
  url?: string;
  apiKey?: string;
  domain: string;
  component?: string;
  environment?: string;
  token?: string;
  exp?: number;
};

/**
 * SwitcherOptions is used to set optional settings
 * 
 * @param local - When enabled it will use the local snapshot (file or in-memory)
 * @param logger - When enabled it allows inspecting the result details with Switcher.getLogger(key)
 * @param snapshotLocation - When defined it will use file-managed snapshot
 * @param snapshotAutoUpdateInterval - The interval in milliseconds to auto-update the snapshot
 * @param silentMode - When defined it will switch to local during the specified time beofre it switches back to remote
 * @param regexSafe - When enabled it will check Regex strategy using background workers
 * @param regexMaxBlackList - The regex max black list
 * @param regexMaxTimeLimit - The regex max time limit
 * @param certPath - The certificate path
 */
export type SwitcherOptions = {
  local?: boolean;
  logger?: boolean;
  snapshotLocation?: string;
  snapshotAutoUpdateInterval?: number;
  silentMode?: string;
  regexSafe?: boolean;
  regexMaxBlackList?: number;
  regexMaxTimeLimit?: number;
  certPath?: string;
};

export type RetryOptions = {
  retryTime: number;
  retryDurationIn: string;
};

// Remote API types

export type AuthResponse = {
  token: string;
  exp: number;
};

export type CheckSnapshotVersionResponse = {
  status: boolean;
};

// Switcher API domain types

export type Snapshot = {
  data: SnapshotData;
};

export type SnapshotData = {
  domain: Domain;
};

export type Domain = {
  name: string;
  version: number;
  activated: boolean;
  group: Group[];
};

export type Group = {
  name: string;
  activated: boolean;
  config: Config[];
};

export type Config = {
  key: string;
  activated: boolean;
  strategies: Strategy[];
};

export type Strategy = {
  strategy: string;
  activated: boolean;
  operation: string;
  values: string[];
};

export type Entry = {
  strategy: string;
  input: string;
};

/**
 * ResultDetail type is returned when using Switcher:detail() method
 */
export type ResultDetail = {
  result: boolean;
  reason?: string;
  metadata?: object;
};
