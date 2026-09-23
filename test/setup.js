/**
 * Test setup (pass 57): an in-memory localStorage for the core modules, which
 * are DOM-free by design and run under plain node. It has a byte capacity,
 * counted the way browsers do (UTF-16, key plus value), so a test can fill it
 * and get a real QuotaExceededError out of setItem() rather than mocking
 * save(). Each test starts with a fresh, effectively unlimited store.
 */

import { beforeEach } from "vitest";

export function createStorage(capacity = Infinity) {
  const map = new Map();
  const size = () => [...map].reduce((n, [k, v]) => n + (k.length + v.length) * 2, 0);
  return {
    capacity,
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      const value = String(v);
      const held = map.has(k) ? (k.length + map.get(k).length) * 2 : 0;
      if (size() - held + (k.length + value.length) * 2 > this.capacity) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      map.set(k, value);
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
    /** Bytes in use, for tests that need to set a capacity just above it. */
    used: size,
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorage(),
    configurable: true,
    writable: true,
  });
});
