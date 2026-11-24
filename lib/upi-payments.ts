import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PAYMENT_TABLE = "qrcraft_upi_payments";
const ADMIN_SESSION_COOKIE = "qrcraft_admin_session";
const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

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
  const configuredUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!configuredUrl || !serviceKey)
    throw new Error("Payment storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the server environment.");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("SUPABASE_URL must be your project's URL, for example https://your-project-ref.supabase.co.");
  }
  const localHttp = parsedUrl.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1");
  if ((!localHttp && parsedUrl.protocol !== "https:") ||
      parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash || parsedUrl.username || parsedUrl.password)
    throw new Error("SUPABASE_URL must be the project URL (https://your-project-ref.supabase.co), without a REST path or API key.");
  return { url: configuredUrl.replace(/\/+$/, ""), serviceKey };
}

function storageRequestError(status: number, code?: string) {
  const details = code ? `, ${code}` : "";
  return new Error(`Supabase request failed (HTTP ${status}${details}). Check the project URL, service-role key, and Supabase setup SQL.`);
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
    throw storageRequestError(response.status, error.code);
  }
  return body as T;
}

async function countPayments(status?: PaymentStatus) {
  const { url, serviceKey } = supabaseConfig();
  const query = new URLSearchParams({ select: "reference" });
  if (status) query.set("status", `eq.${status}`);
  const response = await fetch(`${url}/rest/v1/${PAYMENT_TABLE}?${query}`, {
    method: "HEAD",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "count=exact",
      Range: "0-0"
    },
    cache: "no-store"
  });
  if (!response.ok) throw storageRequestError(response.status);
  const count = response.headers.get("content-range")?.split("/")[1];
  if (!count || count === "*" || !/^\d+$/.test(count))
    throw new Error("Supabase did not return a valid payment count.");
  return Number(count);
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

export async function getPaymentSummary() {
  const [total, pending, approved, rejected] = await Promise.all([
    countPayments(),
    countPayments("pending"),
    countPayments("approved"),
    countPayments("rejected")
  ]);
  return { total, pending, approved, rejected, revenueInr: approved * 9 };
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

export function isAdminLoginConfigured() {
  const username = process.env.PRO_ADMIN_USERNAME;
  const password = process.env.PRO_ADMIN_PASSWORD;
  const secret = process.env.PRO_ADMIN_SESSION_SECRET;
  return Boolean(username?.trim() && password && Buffer.byteLength(password, "utf8") >= 12 &&
    secret && Buffer.byteLength(secret, "utf8") >= 32);
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.PRO_ADMIN_USERNAME?.trim();
  const expectedPassword = process.env.PRO_ADMIN_PASSWORD;
  if (!isAdminLoginConfigured() || !expectedUsername || !expectedPassword) return false;
  return equalText(username.trim(), expectedUsername) && equalText(password, expectedPassword);
}

function adminSessionSignature(payload: string) {
  const secret = process.env.PRO_ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32)
    throw new Error("Admin session signing is not configured.");
  return createHmac("sha256", secret).update(`qrcraft-admin-session-v1|${payload}`).digest("base64url");
}

export function createAdminSession() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${issuedAt}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${adminSessionSignature(payload)}`;
}

export function adminSessionCookie(value: string, clear = false) {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${clear ? "" : value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${clear ? 0 : ADMIN_SESSION_SECONDS}`
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}

export function isValidAdminSession(request: Request) {
  if (!isAdminLoginConfigured()) return false;
  const cookie = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  if (!cookie) return false;

  const match = /^(\d{10})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(cookie);
  if (!match) return false;
  const issuedAt = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + 60 || now - issuedAt > ADMIN_SESSION_SECONDS) return false;
  return equalText(adminSessionSignature(`${match[1]}.${match[2]}`), match[3]);
}
