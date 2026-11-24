import {
  getPaymentSummary,
  isAdminLoginConfigured,
  isValidAdminSession,
  listPayments,
  updatePaymentStatus
} from "@/lib/upi-payments";

export const runtime = "nodejs";

function unauthorized() {
  const configured = isAdminLoginConfigured();
  return Response.json(
    { error: configured ? "Please sign in to review payments." : "Admin login is not configured." },
    { status: configured ? 401 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: Request) {
  if (!isValidAdminSession(request)) return unauthorized();
  try {
    const payments = await listPayments();
    try {
      const summary = await getPaymentSummary();
      return Response.json({ payments, summary }, { headers: { "Cache-Control": "no-store" } });
    } catch (cause) {
      const summaryError = cause instanceof Error ? cause.message : "Payment summary is temporarily unavailable.";
      return Response.json({ payments, summary: null, summaryError }, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Payment storage is temporarily unavailable.";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!isValidAdminSession(request)) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Review details are invalid." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "Review details are required." }, { status: 400 });
  const { reference, status } = body as Record<string, unknown>;
  if (typeof reference !== "string" || !/^[A-F0-9]{12}$/.test(reference) ||
      (status !== "approved" && status !== "rejected"))
    return Response.json({ error: "Choose an order and an approve/reject action." }, { status: 400 });
  try {
    const payment = await updatePaymentStatus(reference, status);
    if (!payment) return Response.json({ error: "Payment request was not found." }, { status: 404 });
    return Response.json({ status: payment.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Payment review could not be saved.";
    return Response.json({ error: message }, { status: 503 });
  }
}
