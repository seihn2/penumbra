// Provides a deterministic navigator so modules that read navigator.userAgent
// at import time (e.g. env.ts -> isMac) resolve consistently under node.
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  configurable: true
})

// Minimal in-memory localStorage so zustand persist-backed stores (chat, etc.)
// can be exercised under the node test environment. The runner may expose a
// stub `{}` with no methods, so key off setItem rather than existence.
if (typeof (globalThis.localStorage as Storage | undefined)?.setItem !== 'function') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => void store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      }
    },
    configurable: true
  })
}
