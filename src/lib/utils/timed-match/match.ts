export default function tryMatch(values: string[], input: string): boolean {
  let result = false;
  for (const value of values) {
    if (RegExp(value).exec(input)) {
      result = true;
      break;
    }
  }

  return result;
}
