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
