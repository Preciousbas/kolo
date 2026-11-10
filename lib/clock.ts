let nowFn = () => Date.now();

export function nowMs(): number {
  return nowFn();
}

export function setNowMsForTests(fn: () => number): void {
  nowFn = fn;
}

export function resetNowMs(): void {
  nowFn = () => Date.now();
}
