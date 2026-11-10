import { resolveDemoCircleId } from "./demo-state";

export function isDemoCircleId(id: string): boolean {
  if (id === "demo") return true;
  const demo = resolveDemoCircleId();
  return Boolean(demo && id === demo);
}
