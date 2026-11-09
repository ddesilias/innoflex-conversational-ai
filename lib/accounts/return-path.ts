// Only product destinations are accepted. Do not reflect arbitrary query
// strings, external URLs or protocol-relative paths into navigation.
export function loginReturnPath(value: unknown): '/' | '/trading-journal' {
  return value === '/trading-journal' ? '/trading-journal' : '/'
}
