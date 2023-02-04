function tryMatch(values: string[], input: string): boolean {
  let result = false;
  for (const value of values) {
    if (input.match(value)) {
      result = true;
      break;
    }
  }

  return result;
}

self.onmessage = (e: MessageEvent<_Param>) => {
  const params: _Param = e.data;
  self.postMessage(tryMatch(params.values, params.input));
};

class _Param {
  values: string[] = [];
  input = '';
}
