import tryMatch from './match.ts';

declare global {
  interface Window {
    onmessage: (e: MessageEvent<Param>) => void;
    postMessage: (message: boolean) => void;
  }
}

self.onmessage = (e: MessageEvent<Param>) => {
  const params: Param = e.data;
  const sharedArray = new Int32Array(params.sharedBuffer);
  const result = tryMatch(params.values, params.input);

  // Write result to shared memory
  sharedArray[1] = result ? 1 : 0; // result
  sharedArray[0] = 1; // mark as completed

  // Notify the waiting thread
  Atomics.notify(sharedArray, 0);
};

type Param = {
  values: string[];
  input: string;
  sharedBuffer: SharedArrayBuffer;
};
