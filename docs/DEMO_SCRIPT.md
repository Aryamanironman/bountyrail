# BountyRail — three-minute demo script

Target: **2:50**. Judges are not required to watch past 3:00, and may score from the video alone.

## Before you hit record

- [ ] `.env.local` has real PayPal **sandbox** credentials — the header must read **PayPal sandbox**, not **Demo mode**.
- [ ] An `AI_API_KEY` is configured, so the judge badge reads **AI model**, not **Deterministic fallback**.
- [ ] A sandbox **personal** account exists for the contributor email (e.g. `maya@example.com`).
- [ ] You are already signed into the sandbox buyer account in another tab, so approval takes seconds.
- [ ] `PUBLIC_BASE_URL` points at the running app; `npm run dev` (or `npm start`) is up.
- [ ] Data reset: delete `.data/db.json`, restart, then click **Load demo bounties**.
- [ ] Browser at 100% zoom, bookmarks hidden, one clean window. No copyrighted music or logos.
- [ ] Screen recorder at 1080p; mic levels checked.

## Shot list

### 0:00–0:18 — the problem (home page)

On screen: hero, cursor slowly over the headline.

> "Open source has a payment problem. A company promises a bounty in a GitHub issue, the work gets
> merged, and then the contributor waits three weeks — or never gets paid at all. Contributors learn
> not to bother. So we flipped it: the money goes in first."

Beat: click **Post a bounty**.

### 0:18–0:45 — funding before work

On screen: the create form. Fill it live, quickly:

- Title: `Add retry with exponential backoff`
- Repo: `acme/httpkit`, issue `142`, amount `150`
- Criteria: three lines (retries / tests / config defaults)
- Contributor email: the sandbox personal account

Click **Lock escrow & post bounty**. Land on the detail page.

> "The sponsor isn't promising to pay. They're authorizing the money now, through PayPal Orders.
> Held, not captured."

### 0:45–1:10 — approve in PayPal

Click **Approve escrow in PayPal** → sandbox login → review the $150 authorization → **Approve**.
Return to BountyRail.

> "There's the PayPal order ID. Funds are reserved against the sponsor's account. The contributor
> can see the money exists before writing a line of code."

Click **I've approved — lock escrow**. The rail's second node turns green and shows the
authorization ID.

### 1:10–1:40 — AI review

Click **Run AI review (demo patch)**.

> "A pull request arrives. The judge gets the diff, the test output, and every acceptance criterion —
> and has to show its work."

Let the checks land. Point at:

- score out of 100,
- three green criteria with evidence lines,
- the model name.

> "Notice what the AI does not get: there is no capture credential in this process. It produces
> evidence. It cannot move money."

### 1:40–2:10 — the second key

Scroll to **Second key required**. Tick the checkbox.

> "The maintainer is the second key. They reviewed the evidence; now they confirm."

Click **Release $150**. Let the page refresh. Point at **Paid** and the PayPal trail: authorization,
capture, payout batch, payout item.

> "One confirmation captures the authorization and sends a PayPal payout. The contributor gets the
> money in their PayPal account — and every step left an ID behind."

Optional cutaway: the sandbox personal account's transaction list showing the incoming payment.

### 2:10–2:40 — the automatic path (optional but strong)

Cut to GitHub: open a PR that says `Fixes #142`, merge it. Cut back to BountyRail; the webhook has
already produced the review.

> "On a real repository you don't even submit. The webhook fires on merge, the judge runs, and the
> maintainer only has to release."

If you skip this, use the time to show the four-bounty dashboard instead.

### 2:40–2:55 — close

Back on the home hero.

> "BountyRail makes open-source bounties credible again: funded up front, verified with evidence,
> and paid through PayPal the moment the work lands. Money first. Then work. Then payment."

End card: repo URL + demo URL.

## Editing notes

- Cut every mouse-hunting pause. The first 20 seconds decide whether a judge keeps watching.
- Keep PayPal IDs legible: zoom to 110% for the trail panel if needed.
- Do not speed-ramp the AI review — show it finishing.
- Captions for the hook line and the close.

## Backup plan

If the sandbox payout fails on camera:

1. Do not hide it. Say: "Payouts can fail — and that's the point of a rail."
2. Show `PAYOUT_FAILED`, the error, and click **Retry payout**.
3. If it fails again, cut to the successful mock-mode run and label it honestly as a simulation.

A shown failure with a retry is better than a fake success.
