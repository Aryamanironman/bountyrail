import Link from "next/link";
import { CreateBountyForm } from "@/components/CreateBountyForm";
import { paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default function NewBountyPage() {
  const mode = paypalMode();
  return (
    <main className="detail">
      <div className="container" style={{ maxWidth: 900 }}>
        <Link className="crumb" href="/">
          ← All bounties
        </Link>
        <div className="detail-head">
          <h1 className="detail-title">Post a bounty</h1>
          <p className="section-sub">
            Funds are authorized before the bounty goes live. The contributor sees a funded prize,
            and the money is only captured after an AI review and your explicit release.
          </p>
        </div>

        <CreateBountyForm />

        <p className="action-note" style={{ textAlign: "left", marginTop: 18 }}>
          {mode === "live"
            ? "PayPal sandbox is connected. After creating the bounty you will approve the authorization, then post the issue."
            : "Demo mode: no PayPal credentials are configured, so the escrow order is simulated. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to run live sandbox calls."}
        </p>
      </div>
    </main>
  );
}
