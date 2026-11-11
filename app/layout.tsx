import type { Metadata } from "next";
import Link from "next/link";
import { paypalMode } from "@/lib/paypal";
import "./globals.css";

export const metadata: Metadata = {
  title: "BountyRail — bounties that pay themselves",
  description:
    "Escrowed open-source bounties: a sponsor locks funds with PayPal, an AI verifies the pull request, and payment releases on merge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = paypalMode();
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "#";

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label="BountyRail home">
              <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M6 9h20M6 23h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="16" r="3.2" fill="currentColor" />
                <circle cx="21" cy="16" r="3.2" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M14.2 16h3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="brand-text">
                Bounty<span>Rail</span>
              </span>
            </Link>
            <nav className="header-nav" aria-label="Main">
              <Link href="/#rail">The rail</Link>
              <Link href="/#how">How it works</Link>
              {repoUrl !== "#" ? (
                <a href={repoUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              ) : null}
            </nav>
            <div className="header-actions">
              <span
                className={`mode-chip ${mode === "live" ? "mode-live" : "mode-mock"}`}
                title={
                  mode === "live"
                    ? "Connected to PayPal sandbox"
                    : "No PayPal credentials: orders are simulated"
                }
              >
                <span className="mode-dot" />
                {mode === "live" ? "PayPal sandbox" : "Demo mode"}
              </span>
              <Link href="/bounties/new" className="btn btn-primary btn-sm">
                Post a bounty
              </Link>
            </div>
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="container footer-inner">
            <p>
              BountyRail — escrow for open source. Built for the PayPal AI Hackathon.
            </p>
            <p className="footer-fine">
              MIT licensed · AI reviews evidence; a human releases funds ·{" "}
              {mode === "live" ? "PayPal sandbox" : "demo mode"}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
