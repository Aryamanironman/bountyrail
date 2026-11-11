export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function shortId(id: string, head = 10): string {
  if (!id) return "-";
  return id.length <= head + 3 ? id : `${id.slice(0, head)}...`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function statusTone(status: string): string {
  switch (status) {
    case "PAID":
      return "tone-green";
    case "VERIFIED":
      return "tone-cyan";
    case "ESCROWED":
      return "tone-blue";
    case "NEEDS_WORK":
      return "tone-amber";
    case "PAYOUT_FAILED":
      return "tone-red";
    default:
      return "tone-muted";
  }
}
