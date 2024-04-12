export {};

declare global {
  interface Window {
    onmessage: (e: MessageEvent<Param>) => void;
    postMessage: (message: boolean) => void;
  }

  type Param = {
    values: string[];
    input: string;
  };
}

export type SwitcherContext = {
  url?: string;
  apiKey?: string;
  domain: string;
  component?: string;
  environment: string;
  token?: string;
  exp?: number;
};

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

export type Criteria = {
  result: boolean;
  reason?: string;
};

export type ResultDetail = {
  result: boolean;
  reason?: string;
  metadata?: object;
};
