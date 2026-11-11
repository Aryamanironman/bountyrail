import { describe, expect, it } from "vitest";
import {
  authorizeEscrow,
  captureAuthorization,
  createEscrowOrder,
  paypalMode,
  sendPayout,
} from "../lib/paypal";

describe("paypal client in mock mode", () => {
  it("reports mock mode without credentials", () => {
    expect(paypalMode()).toBe("mock");
  });

  it("creates a mock authorization order with a local approval link", async () => {
    const escrow = await createEscrowOrder({
      bountyId: "bty_123",
      title: "Test bounty",
      amountCents: 15000,
    });
    expect(escrow.mode).toBe("mock");
    expect(escrow.orderId).toMatch(/^MOCK-ORD-/);
    expect(escrow.approveUrl).toContain("/bounties/bty_123");
  });

  it("authorizes, captures and pays out with deterministic mock shapes", async () => {
    const auth = await authorizeEscrow("MOCK-ORD-X");
    expect(auth.authorizationId).toMatch(/^MOCK-AUTH-/);
    expect(auth.status).toBe("CREATED");

    const capture = await captureAuthorization(auth.authorizationId);
    expect(capture.captureId).toMatch(/^MOCK-CAP-/);
    expect(capture.status).toBe("COMPLETED");

    const payout = await sendPayout({
      bountyId: "bty_123",
      receiver: "dev@example.com",
      amountCents: 15000,
      note: "Bounty",
    });
    expect(payout.batchId).toMatch(/^MOCK-BATCH-/);
    expect(payout.status).toBe("SUCCESS");
  });
});
