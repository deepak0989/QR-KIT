import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PAYMENT_TTL_SECONDS = 60 * 60 * 24 * 90;
const PAYMENT_INDEX = "qrcraft:upi:payments";
const LICENSE_PREFIX = "qrcraft:upi:license:";

export type PaymentStatus = "pending" | "approved" | "rejected";

export type UpiPayment = {
  reference: string;
  name: string;
  email: string;
  utr: string;
  submittedAt: number;
  status: PaymentStatus;
  accessKeyHash: string;
  licenseCode?: string;
  approvedAt?: number;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) throw new Error("Payment storage is not configured. Add the Upstash Redis REST URL and token.");
  return { url: url.replace(/\/+$/, ""), token };
}

async function redisCommand<T>(...command: (string | number)[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Payment storage could not be reached.");
  const body = await response.json() as { result?: T; error?: string };
  if (body.error) throw new Error("Payment storage request failed.");
  return body.result as T;
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

function paymentKey(reference: string) {
  return `qrcraft:upi:payment:${reference}`;
}

function validateReference(reference: string) {
  if (!/^[A-F0-9]{12}$/.test(reference)) throw new Error("Payment reference is invalid.");
}

async function getPayment(reference: string) {
  validateReference(reference);
  const raw = await redisCommand<string | null>("GET", paymentKey(reference));
  if (!raw) return null;
  return JSON.parse(raw) as UpiPayment;
}

async function savePayment(payment: UpiPayment) {
  await redisCommand(
    "SET",
    paymentKey(payment.reference),
    JSON.stringify(payment),
    "EX",
    PAYMENT_TTL_SECONDS
  );
}

async function getLicense(reference: string) {
  const raw = await redisCommand<string | null>("GET", `${LICENSE_PREFIX}${reference}`);
  return raw ? JSON.parse(raw) as Pick<UpiPayment, "reference" | "accessKeyHash" | "licenseCode" | "approvedAt"> : null;
}

export async function createPayment(input: { name: string; email: string; utr: string }) {
  const reference = randomBytes(6).toString("hex").toUpperCase();
  const accessKey = randomBytes(32).toString("base64url");
  const utrHash = createHash("sha256").update(input.utr.trim().toUpperCase()).digest("hex");
  const reserved = await redisCommand<string | null>(
    "SET",
    `qrcraft:upi:utr:${utrHash}`,
    reference,
    "NX",
    "EX",
    PAYMENT_TTL_SECONDS
  );
  if (reserved !== "OK") throw new Error("That UPI reference was already submitted.");

  const payment: UpiPayment = {
    ...input,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    utr: input.utr.trim(),
    reference,
    submittedAt: Date.now(),
    status: "pending",
    accessKeyHash: createHash("sha256").update(accessKey).digest("hex")
  };
  await savePayment(payment);
  await redisCommand("ZADD", PAYMENT_INDEX, payment.submittedAt, reference);
  return { reference, accessKey, status: payment.status };
}

export async function getPaymentStatus(reference: string, accessKey: string) {
  const payment = await getPayment(reference);
  const license = payment?.status === "approved" || !payment ? await getLicense(reference) : null;
  if (!payment && !license) return null;
  const storedAccessKeyHash = payment?.accessKeyHash ?? license?.accessKeyHash;
  if (!storedAccessKeyHash) return null;
  const suppliedHash = createHash("sha256").update(accessKey).digest("hex");
  if (!equalText(suppliedHash, storedAccessKeyHash)) return null;
  if (!payment && license) return { reference, status: "approved" as const, licenseCode: license.licenseCode };
  return {
    reference: payment!.reference,
    status: payment!.status,
    licenseCode: payment!.status === "approved" ? license?.licenseCode : undefined
  };
}

export async function listPayments() {
  const references = await redisCommand<string[]>("ZREVRANGE", PAYMENT_INDEX, 0, 99);
  const payments = await Promise.all(references.map((reference) => getPayment(reference)));
  const expiredReferences = references.filter((_, index) => payments[index] === null);
  if (expiredReferences.length) await redisCommand("ZREM", PAYMENT_INDEX, ...expiredReferences);
  return payments.filter((payment): payment is UpiPayment => payment !== null)
    .map(({ reference, name, email, utr, submittedAt, status }) => ({
      reference, name, email, utr, submittedAt, status
    }));
}

export async function updatePaymentStatus(reference: string, status: "approved" | "rejected") {
  const payment = await getPayment(reference);
  if (!payment) return null;
  if (payment.status !== "pending") return payment;
  payment.status = status;
  if (status === "approved") {
    payment.approvedAt = Date.now();
    payment.licenseCode = licenseFor(reference);
    await redisCommand(
      "SET",
      `${LICENSE_PREFIX}${reference}`,
      JSON.stringify({
        reference,
        accessKeyHash: payment.accessKeyHash,
        licenseCode: payment.licenseCode,
        approvedAt: payment.approvedAt
      })
    );
  }
  await savePayment(payment);
  return payment;
}

export async function isValidLicense(code: string) {
  const match = /^QRC1\.([A-F0-9]{12})\.([A-Za-z0-9_-]{43})$/.exec(code);
  if (!match) return false;
  const license = await getLicense(match[1]);
  if (!license || license.licenseCode !== code) return false;
  return equalText(licenseFor(match[1]), code);
}

export function isValidAdminToken(request: Request) {
  const expected = process.env.PRO_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || Buffer.byteLength(expected, "utf8") < 32 || !supplied) return false;
  return equalText(supplied, expected);
}
