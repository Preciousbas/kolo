import { afterEach, describe, expect, it } from "vitest";
import { recall, remember, resetMemoryForTests } from "../lib/memory";

describe("memory", () => {
  afterEach(() => {
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    delete process.env.KOLO_MEMORY_MOCK;
    resetMemoryForTests();
  });

  it("falls back to mock without keys and recalls a memory", async () => {
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    const namespace = "kolo-unit";
    await remember("hello kolo savings", namespace);
    const recalled = await recall("hello kolo", 5, namespace);
    const texts = (recalled.results ?? []).map((item) => item.text ?? "");
    expect(texts.some((text) => text.includes("hello kolo savings"))).toBe(true);
  });
});
