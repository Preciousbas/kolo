/** Vitest stub for next/cache — runs the cached fn immediately. */
export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
