export {};

declare global {
  interface Window {
    onmessage: (e: MessageEvent<_Param>) => void;
    postMessage: (message: boolean) => void;
  }

  interface _Param {
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
  offline?: boolean;
  logger?: boolean;
  snapshotLocation?: string;
  silentMode?: boolean;
  retryAfter?: string;
  regexMaxBlackList?: number;
  regexMaxTimeLimit?: number;
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