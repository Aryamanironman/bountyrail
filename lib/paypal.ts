import type { Escrow, EscrowMode } from "./types";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET?.trim();
const PAYPAL_ENV = process.env.PAYPAL_ENV === "production" ? "production" : "sandbox";
const API_BASE =
  PAYPAL_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "http://localhost:3100").replace(/\/$/, "");

export class PayPalError extends Error {
  readonly status: number;
  readonly debugId?: string;
  readonly details?: unknown;

  constructor(message: string, status = 502, debugId?: string, details?: unknown) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
    this.debugId = debugId;
    this.details = details;
  }
}

export class NeedsApprovalError extends Error {
  readonly approveUrl: string;

  constructor(approveUrl: string) {
    super("Escrow order still needs buyer approval");
    this.name = "NeedsApprovalError";
    this.approveUrl = approveUrl;
  }
}

export function paypalMode(): EscrowMode {
  return CLIENT_ID && CLIENT_SECRET ? "live" : "mock";
}

export function isLive(): boolean {
  return paypalMode() === "live";
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function mockId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `MOCK-${prefix}-${rand}`;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  if (!CLIENT_ID || !CLIENT_SECRET) throw new PayPalError("PayPal credentials are not configured", 500);
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new PayPalError(`PayPal auth failed (${res.status})`, res.status, undefined, text.slice(0, 400));
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const payload = json as { message?: string; debug_id?: string } | null;
    throw new PayPalError(
      payload?.message || `PayPal request failed (${res.status})`,
      res.status,
      payload?.debug_id,
      json,
    );
  }
  return json as T;
}

interface OrderResponse {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: {
      authorizations?: { id: string; status: string }[];
      captures?: { id: string; status: string }[];
    };
  }[];
}

export interface CreateEscrowInput {
  bountyId: string;
  title: string;
  amountCents: number;
  currency?: "USD";
}

export async function createEscrowOrder(input: CreateEscrowInput): Promise<Escrow> {
  if (!isLive()) {
    return {
      mode: "mock",
      orderId: mockId("ORD"),
      approveUrl: `${PUBLIC_BASE_URL}/bounties/${input.bountyId}`,
    };
  }
  const order = await paypalFetch<OrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "AUTHORIZE",
      purchase_units: [
        {
          custom_id: input.bountyId,
          description: `Bounty escrow: ${input.title}`.slice(0, 127),
          amount: { currency_code: input.currency || "USD", value: dollars(input.amountCents) },
        },
      ],
      application_context: {
        brand_name: "BountyRail",
        user_action: "PAY_NOW",
        return_url: `${PUBLIC_BASE_URL}/bounties/${input.bountyId}?paypal=return`,
        cancel_url: `${PUBLIC_BASE_URL}/bounties/${input.bountyId}?paypal=cancel`,
      },
    }),
  });
  const approveUrl = order.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  return { mode: "live", orderId: order.id, approveUrl };
}

export interface AuthorizationResult {
  authorizationId: string;
  status: string;
  approveUrl?: string;
}

/**
 * Converts a buyer-approved AUTHORIZE order into a held authorization.
 * Funds are not captured yet - that happens only when the maintainer releases.
 */
export async function authorizeEscrow(orderId: string): Promise<AuthorizationResult> {
  if (!isLive()) {
    return { authorizationId: mockId("AUTH"), status: "CREATED" };
  }
  const order = await paypalFetch<OrderResponse>(`/v2/checkout/orders/${orderId}`);
  if (order.status === "CREATED") {
    const approveUrl = order.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
    throw new NeedsApprovalError(approveUrl || "");
  }
  if (order.status === "COMPLETED") {
    const existing = order.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (existing) return { authorizationId: existing.id, status: existing.status };
  }
  const authorized = await paypalFetch<OrderResponse>(`/v2/checkout/orders/${orderId}/authorize`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const authorization = authorized.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!authorization) {
    throw new PayPalError("PayPal did not return an authorization for this order", 502, undefined, authorized);
  }
  return { authorizationId: authorization.id, status: authorization.status };
}

export async function captureAuthorization(authorizationId: string): Promise<{ captureId: string; status: string }> {
  if (!isLive()) {
    return { captureId: mockId("CAP"), status: "COMPLETED" };
  }
  const result = await paypalFetch<{ id: string; status: string }>(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return { captureId: result.id, status: result.status };
}

export interface PayoutInput {
  bountyId: string;
  receiver: string;
  amountCents: number;
  note: string;
  attempt?: number;
}

export async function sendPayout(input: PayoutInput): Promise<{ batchId: string; itemId: string; status: string }> {
  if (!isLive()) {
    return { batchId: mockId("BATCH"), itemId: mockId("ITEM"), status: "SUCCESS" };
  }
  const attempt = input.attempt ?? 0;
  const result = await paypalFetch<{
    batch_header?: { payout_batch_id: string; batch_status: string };
    items?: { payout_item_id: string; transaction_status: string }[];
  }>("/v1/payments/payouts", {
    method: "POST",
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `bountyrail-${input.bountyId}${attempt ? `-r${attempt}` : ""}`.slice(0, 256),
        email_subject: "Your BountyRail payout",
        email_message: "An AI-verified pull request was merged. Here is your bounty.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { currency: "USD", value: dollars(input.amountCents) },
          receiver: input.receiver,
          note: input.note.slice(0, 255),
          sender_item_id: input.bountyId.slice(0, 63),
        },
      ],
    }),
  });
  const batch = result.batch_header;
  const item = result.items?.[0];
  if (!batch?.payout_batch_id) {
    throw new PayPalError("PayPal did not return a payout batch", 502, undefined, result);
  }
  return {
    batchId: batch.payout_batch_id,
    itemId: item?.payout_item_id || "",
    status: item?.transaction_status || batch.batch_status,
  };
}
