import tryMatch from './match.ts';

self.onmessage = (e: MessageEvent<Param>) => {
  const params: Param = e.data;
  self.postMessage(tryMatch(params.values, params.input));
};

type Param = {
  values: string[];
  input: string;
};
