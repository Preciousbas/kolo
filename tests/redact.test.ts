import { afterEach, describe, expect, it } from "vitest";
import { redact } from "../lib/redact";

describe("redact", () => {
  afterEach(() => {
    delete process.env.TATUM_API_KEY;
    delete process.env.MEMWAL_PRIVATE_KEY;
  });

  it("hides secret env values", () => {
    process.env.TATUM_API_KEY = "unit-test-secret-value";
    process.env.MEMWAL_PRIVATE_KEY = "another-unit-secret";
    const output = redact("tatum unit-test-secret-value mem another-unit-secret");
    expect(output).toBe("tatum *** mem ***");
    expect(output).not.toContain("unit-test-secret-value");
    expect(output).not.toContain("another-unit-secret");
  });
});
