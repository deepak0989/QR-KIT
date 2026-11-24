import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PAYMENT_TABLE = "qrcraft_upi_payments";

export type PaymentStatus = "pending" | "approved" | "rejected";

type StoredPayment = {
  reference: string;
  name: string | null;
  email: string | null;
  utr: string | null;
  utr_hash: string | null;
  submitted_at: string;
  status: PaymentStatus;
  access_key_hash: string;
  license_code: string | null;
  approved_at: string | null;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey)
    throw new Error("Payment storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the server environment.");
  return { url, serviceKey };
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceKey } = supabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === "object" ? body as { code?: string } : {};
    if (response.status === 409 && error.code === "23505")
      throw new Error("That UPI reference was already submitted.");
    throw new Error("Supabase payment storage request failed.");
  }
  return body as T;
}

function licenseSecret() {
  const secret = process.env.PRO_LICENSE_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32)
    throw new Error("Pro license signing is not configured. Set PRO_LICENSE_SECRET to a random secret of at least 32 bytes.");
  return secret;
}

function licenseFor(reference: string) {
  const signature = createHmac("sha256", licenseSecret())
    .update(`qrcraft-pro-v1|${reference}`)
    .digest("base64url");
  return `QRC1.${reference}.${signature}`;
}

function equalText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function validateReference(reference: string) {
  if (!/^[A-F0-9]{12}$/.test(reference)) throw new Error("Payment reference is invalid.");
}

async function getPayment(reference: string) {
  validateReference(reference);
  const query = new URLSearchParams({ select: "*", reference: `eq.${reference}`, limit: "1" });
  const rows = await supabaseRequest<StoredPayment[]>(`${PAYMENT_TABLE}?${query}`);
  return rows[0] ?? null;
}

export async function createPayment(input: { name: string; email: string; utr: string }) {
  const reference = randomBytes(6).toString("hex").toUpperCase();
  const accessKey = randomBytes(32).toString("base64url");
  const utrHash = createHash("sha256").update(input.utr.trim().toUpperCase()).digest("hex");
  const query = new URLSearchParams({ select: "reference,status" });
  const rows = await supabaseRequest<Pick<StoredPayment, "reference" | "status">[]>(
    `${PAYMENT_TABLE}?${query}`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        reference,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        utr: input.utr.trim(),
        utr_hash: utrHash,
        submitted_at: new Date().toISOString(),
        status: "pending",
        access_key_hash: createHash("sha256").update(accessKey).digest("hex"),
        license_code: null,
        approved_at: null
      })
    }
  );
  const payment = rows[0];
  if (!payment) throw new Error("Supabase did not return the saved payment request.");
  return { reference: payment.reference, accessKey, status: payment.status };
}

export async function getPaymentStatus(reference: string, accessKey: string) {
  const payment = await getPayment(reference);
  if (!payment) return null;
  const suppliedHash = createHash("sha256").update(accessKey).digest("hex");
  if (!equalText(suppliedHash, payment.access_key_hash)) return null;
  return {
    reference: payment.reference,
    status: payment.status,
    licenseCode: payment.status === "approved" ? payment.license_code ?? undefined : undefined
  };
}

export async function listPayments() {
  const query = new URLSearchParams({
    select: "reference,name,email,utr,submitted_at,status",
    name: "not.is.null",
    email: "not.is.null",
    utr: "not.is.null",
    order: "submitted_at.desc",
    limit: "100"
  });
  const rows = await supabaseRequest<Pick<StoredPayment, "reference" | "name" | "email" | "utr" | "submitted_at" | "status">[]>(
    `${PAYMENT_TABLE}?${query}`
  );
  return rows.flatMap((payment) => {
    if (payment.name === null || payment.email === null || payment.utr === null) return [];
    return [{
      reference: payment.reference,
      name: payment.name,
      email: payment.email,
      utr: payment.utr,
      submittedAt: Date.parse(payment.submitted_at),
      status: payment.status
    }];
  });
}

export async function updatePaymentStatus(reference: string, status: "approved" | "rejected") {
  const payment = await getPayment(reference);
  if (!payment) return null;
  if (payment.status !== "pending") return payment;

  const update: Pick<StoredPayment, "status" | "license_code" | "approved_at"> = {
    status,
    license_code: status === "approved" ? licenseFor(reference) : null,
    approved_at: status === "approved" ? new Date().toISOString() : null
  };
  const query = new URLSearchParams({ reference: `eq.${reference}`, status: "eq.pending", select: "*" });
  const updated = await supabaseRequest<StoredPayment[]>(`${PAYMENT_TABLE}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(update)
  });
  return updated[0] ?? await getPayment(reference);
}

export async function isValidLicense(code: string) {
  const match = /^QRC1\.([A-F0-9]{12})\.([A-Za-z0-9_-]{43})$/.exec(code);
  if (!match) return false;
  const payment = await getPayment(match[1]);
  if (payment?.status !== "approved" || payment.license_code !== code) return false;
  return equalText(licenseFor(match[1]), code);
}

export function isValidAdminToken(request: Request) {
  const expected = process.env.PRO_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || Buffer.byteLength(expected, "utf8") < 32 || !supplied) return false;
  return equalText(supplied, expected);
}
