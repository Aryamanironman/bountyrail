# SplitSense: one payment, split correctly

## problem {hold=1.0}
A creator closes a brand deal. Four thousand dollars arrives as one PayPal payment. An editor and an artist helped make the video. Part of the money belongs to tax. [#spreadsheet] The creator splits it by hand in a spreadsheet.

## rules {transition=push hold=0.9}
{SplitSense|Split Sense} reads the deal and each person's percentage. [#rules] It writes the split rules once. Every later payment follows them.

## pay {transition=push hold=1.1}
When the payment lands, {SplitSense|Split Sense} divides it. [#fanout] The editor and the artist receive their share through PayPal. The tax part moves to a separate balance.

## ledger {transition=push hold=1.0}
Every payout leaves a record. [#reconcile] The ledger shows what came in, what went out, and what is left.

## control {transition=push hold=1.0}
The creator sees the split before it runs. [#approve] One confirmation sends the payments. Nothing moves without it.

## close {transition=push hold=1.8}
One payment arrives, and everyone is paid in the same minute. The books match.
