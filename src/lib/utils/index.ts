export function get<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}
