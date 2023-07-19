function tryMatch(values: string[], input: string): boolean {
  let result = false;
  for (const value of values) {
    if (RegExp(value).exec(input)) {
      result = true;
      break;
    }
  }

  return result;
}

self.onmessage = (e: MessageEvent<Param>) => {
  const params: Param = e.data;
  self.postMessage(tryMatch(params.values, params.input));
};

interface Param {
  values: string[];
  input: string;
}
