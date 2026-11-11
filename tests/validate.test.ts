import { describe, expect, it } from "vitest";
import { parseCreateBounty, parseSubmission } from "../lib/validate";

const VALID = {
  title: "Add retry with backoff",
  repo: "acme/httpkit",
  issueNumber: 142,
  amountCents: 15000,
  criteria: "Retries failed requests\nAdds unit tests",
  contributorEmail: "Maya@Example.com",
};

describe("parseCreateBounty", () => {
  it("accepts a valid payload and normalizes the email", () => {
    const result = parseCreateBounty(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contributorEmail).toBe("maya@example.com");
    expect(result.value.criteria).toHaveLength(2);
    expect(result.value.amountCents).toBe(15000);
  });

  it("rejects a repo without an owner", () => {
    const result = parseCreateBounty({ ...VALID, repo: "httpkit" });
    expect(result).toEqual({ ok: false, error: "Repo must look like owner/name" });
  });

  it("rejects amounts below one dollar", () => {
    const result = parseCreateBounty({ ...VALID, amountCents: 99 });
    expect(result.ok).toBe(false);
  });

  it("rejects more than eight criteria", () => {
    const result = parseCreateBounty({
      ...VALID,
      criteria: Array.from({ length: 9 }, (_, i) => `criterion ${i}`),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.criteria).toHaveLength(8);
  });

  it("rejects invalid contributor emails", () => {
    const result = parseCreateBounty({ ...VALID, contributorEmail: "not-an-email" });
    expect(result.ok).toBe(false);
  });
});

describe("parseSubmission", () => {
  it("requires a patch or test output", () => {
    expect(parseSubmission({ diff: "", testOutput: "" }).ok).toBe(false);
  });

  it("accepts a diff and defaults the source to manual", () => {
    const result = parseSubmission({ diff: "--- a\n+++ b\n+hello world" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.source).toBe("manual");
  });
});
