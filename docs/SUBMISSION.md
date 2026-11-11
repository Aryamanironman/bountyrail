# Devpost submission copy — BountyRail

**Tagline:** Bounties that pay themselves.

**Repo:** https://github.com/Aryamanironman/bountyrail
**Demo:** https://bountyrail.vercel.app
**Video:** [ADD YOUTUBE URL]

---

## Inspiration

Open-source bounties are broken in a very specific way: the money is a promise. A company says
"$150 for this fix" in an issue, someone spends a weekend on it, the PR merges — and then payment
takes weeks of chasing, or never happens. Maintainers hate being the payment police, and
contributors learn to ignore bounties entirely.

We wanted the opposite order: **money first, then work, then payment**. The contributor should be
able to see the funds before they start, and the payout should happen the moment the work is
verified.

## What it does

BountyRail is an escrow rail for open-source bounties.

1. A sponsor posts a bounty with acceptance criteria and a PayPal email for the contributor. The
   full amount is authorized through **PayPal Orders v2** (`intent=AUTHORIZE`) — held, not captured.
2. A pull request arrives, either submitted manually or picked up from a **merged GitHub PR** by a
   signature-verified webhook.
3. An **AI judge** receives the diff, the test output and every criterion. It returns a verdict, a
   score out of 100, and one evidence line per criterion.
4. The maintainer reviews that evidence and confirms. Only then does BountyRail capture the
   authorization and send a **PayPal Payouts** transfer to the contributor.

The AI has no capture credential. The release endpoint refuses any request without an explicit
maintainer confirmation. Every order, authorization, capture and payout ID is stored on the bounty
and displayed in a "PayPal trail" panel, so the ledger can be audited after the fact.

It ships with a labelled demo mode (no credentials needed) and a deterministic fallback judge, so
judges can run it immediately and can always tell whether they are looking at a real PayPal call or
a simulation.

## How we built it

- **PayPal Orders v2** for the authorization hold and capture, **PayPal Payouts** for settlement,
  and the PayPal sandbox for end-to-end testing.
- **Next.js 15 / React 19 / TypeScript** with route handlers for the API and server-rendered pages.
- **An LLM judge** over any OpenAI-compatible endpoint (Anthropic Claude by default), with strict
  JSON validation and a deterministic heuristic fallback that is always labelled.
- **GitHub webhooks** with HMAC-SHA256 signature verification and PR-to-bounty matching.
- A compact JSON store with an in-process write lock, plus **Vitest** coverage of validation, the
  judge, webhook matching, the PayPal mock, and the full create → authorize → review → release
  pipeline.

## Challenges we ran into

- Modeling escrow correctly with PayPal primitives: an `AUTHORIZE` order's capture creates an
  authorization *hold*; the actual money moves only when that authorization is captured. Getting the
  state machine right — and refusing illegal transitions — was most of the work.
- Keeping the AI useful without giving it authority. The judge had to be strict, structured, and
  explicitly advisory.
- Making the demo honest. Every fallback and simulation is labelled in the UI; nothing pretends to
  be a live PayPal call when it isn't.

## Accomplishments we're proud of

- A complete money path: order → authorization → AI review → human confirmation → capture → payout,
  with real IDs at every step.
- A demo that runs in one command with zero credentials, then switches to real sandbox calls when
  keys are added.
- A payout-failure path that is visible, recorded and retryable rather than silently swallowed.
- 26 automated tests including the full pipeline.

## What we learned

- Authorization holds are a surprisingly good fit for conditional work: they reserve funds without
  transferring them, and the capture is an explicit, auditable event.
- The hard part of AI-verified payments isn't the model — it's the trust boundary. Evidence and
  authority have to be separate.
- A two-key system (AI evidence + human release) is easier to explain and easier to defend than
  either one alone.

## What's next

- Dispute and refund paths, plus partial releases when only some criteria are met.
- Per-criterion payouts rather than one all-or-nothing amount.
- A webhook-fed CI integration so test evidence is attached automatically instead of asked for.
- Real authentication and a persistent database before any production use.

## Built with

`paypal-orders-v2` · `paypal-payouts` · `paypal-sandbox` · `nextjs` · `react` · `typescript` ·
`groq` · `gpt-oss-120b` · `github-webhooks` · `vitest`

## AI tools used

- **Groq** running **`openai/gpt-oss-120b`** as the bounty review judge in the live demo. The endpoint is configurable, and the code defaults to an Anthropic-compatible one.
- **Claude Code** for implementation, tests and documentation.
- A labelled deterministic fallback runs when no model key is configured.
