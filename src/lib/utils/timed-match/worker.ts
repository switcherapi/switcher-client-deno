import tryMatch from './match.ts';

declare global {
  interface Window {
    onmessage: (e: MessageEvent<Param>) => void;
    postMessage: (message: boolean) => void;
  }
}

self.onmessage = (e: MessageEvent<Param>) => {
  const params: Param = e.data;
  self.postMessage(tryMatch(params.values, params.input));
};

type Param = {
  values: string[];
  input: string;
};
