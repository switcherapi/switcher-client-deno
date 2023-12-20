export {};

declare global {
  interface Window {
    onmessage: (e: MessageEvent<Param>) => void;
    postMessage: (message: boolean) => void;
  }

  interface Param {
    values: string[];
    input: string;
  }
}

export interface SwitcherContext {
  url?: string;
  apiKey?: string;
  domain: string;
  component?: string;
  environment: string;
  token?: string;
  exp?: number;
}

export interface SwitcherOptions {
  local?: boolean;
  logger?: boolean;
  snapshotLocation?: string;
  snapshotAutoUpdateInterval?: number;
  silentMode?: string;
  regexSafe?: boolean;
  regexMaxBlackList?: number;
  regexMaxTimeLimit?: number;
  certPath?: string;
}

export interface RetryOptions {
  retryTime: number;
  retryDurationIn: string;
}

export interface Snapshot {
  data: SnapshotData;
}

export interface SnapshotData {
  domain: Domain;
}

export interface Domain {
  name: string;
  version: number;
  activated: boolean;
  group: Group[];
}

export interface Group {
  name: string;
  activated: boolean;
  config: Config[];
}

export interface Config {
  key: string;
  activated: boolean;
  strategies: Strategy[];
}

export interface Strategy {
  strategy: string;
  activated: boolean;
  operation: string;
  values: string[];
}

export interface Entry {
  strategy: string;
  input: string;
}

export interface Criteria {
  result: boolean;
  reason?: string;
}
