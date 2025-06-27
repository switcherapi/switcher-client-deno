export {};

// Client SDK settings types

/**
 * SwitcherContext is used to build the client context
 */
export type SwitcherContext = {
  /**
   * The API URL, e.g. https://api.switcherapi.com
   */
  url?: string;

  /**
   * The API key provided for the component
   */
  apiKey?: string;

  /**
   * The domain name of the Switcher API account
   */
  domain: string;

  /**
   * The component name registered in the Switcher API account
   */
  component?: string;

  /**
   * The environment name registered in the Switcher API account
   */
  environment?: string;
};

/**
 * SwitcherOptions is used to set optional settings
 */
export type SwitcherOptions = {
  /**
   * When enabled it will use the local snapshot (file or in-memory)
   * If not set, it will use the remote API
   */
  local?: boolean;

  /**
   * When enabled it allows inspecting the result details with Client.getLogger(key)
   * If not set, it will not log the result details
   */
  logger?: boolean;

  /**
   * The location of the snapshot file
   * If not set, it will use the in-memory snapshot
   */
  snapshotLocation?: string;

  /**
   * The interval in milliseconds to auto-update the snapshot
   * If not set, it will not auto-update the snapshot
   */
  snapshotAutoUpdateInterval?: number;

  /**
   * When enabled it will watch the snapshot file for changes
   */
  snapshotWatcher?: boolean;

  /**
   * Allow local snapshots to ignore or require Relay verification.
   */
  restrictRelay?: boolean;

  /**
   * When defined it will switch to local during the specified time before it switches back to remote
   * e.g. 5s (s: seconds - m: minutes - h: hours)
   */
  silentMode?: string;

  /**
   * When enabled it will check Regex strategy using background workers
   * If not set, it will check Regex strategy synchronously
   */
  regexSafe?: boolean;

  /**
   * The regex max black list
   * If not set, it will use the default value
   */
  regexMaxBlackList?: number;

  /**
   * The regex max time limit in milliseconds
   * If not set, it will use the default value
   */
  regexMaxTimeLimit?: number;

  /**
   * The certificate path for secure connections
   * If not set, it will use the default certificate
   */
  certPath?: string;
};

export type RetryOptions = {
  /**
   * The maximum number of retries
   */
  retryTime: number;

  /**
   * The duration to wait between retries
   * e.g. '5s' (s: seconds - m: minutes - h: hours)
   */
  retryDurationIn: string;
};

export type LoadSnapshotOptions = {
  /**
   * When enabled it will watch the snapshot file for changes
   */
  watchSnapshot?: boolean;

  /**
   * When enabled it will fetch the remote API
   */
  fetchRemote?: boolean;
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
  relay: Relay;
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

export type Relay = {
  type: string;
  activated: boolean;
};
