// deno-lint-ignore-file no-explicit-any
export function payloadReader(payload: any): string[] {
  const payloadRead = payload + "" === payload || payload || 0;
  if (Array.isArray(payloadRead)) {
    return payloadRead.flatMap((p) => payloadReader(p));
  }

  return Object.keys(payloadRead)
    .flatMap((field) => [
      field,
      ...payloadReader(payload[field])
        .map((nestedField) => `${field}.${nestedField}`),
    ])
    .filter((field) => isNaN(Number(field)))
    .reduce((acc: string[], curr) => {
      if (!acc.includes(curr)) {
        acc.push(curr);
      }
      return acc;
    }, []);
}

export function parseJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch (_e) {
    return undefined;
  }
}
