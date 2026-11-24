import { sendProLicenseEmail } from "@/lib/pro-email";
import {
  getPaymentSummary,
  isAdminLoginConfigured,
  isValidAdminSession,
  listPayments,
  markLicenseEmailSent,
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
  const { reference, status, resendEmail } = body as Record<string, unknown>;
  if (typeof reference !== "string" || !/^[A-F0-9]{12}$/.test(reference) ||
      (status !== "approved" && status !== "rejected") ||
      (resendEmail !== undefined && typeof resendEmail !== "boolean") ||
      (resendEmail === true && status !== "approved"))
    return Response.json({ error: "Choose an order and an approve/reject action." }, { status: 400 });
  try {
    const payment = await updatePaymentStatus(reference, status);
    if (!payment) return Response.json({ error: "Payment request was not found." }, { status: 404 });
    if (status !== "approved" || payment.status !== "approved")
      return Response.json({ status: payment.status, emailSent: Boolean(payment.license_email_sent_at) }, { headers: { "Cache-Control": "no-store" } });
    if (!payment.email || !payment.name || !payment.license_code)
      return Response.json({
        status: payment.status,
        emailSent: false,
        emailError: "This approved payment has no retained email or license code to send."
      }, { headers: { "Cache-Control": "no-store" } });
    if (payment.license_email_sent_at && resendEmail !== true)
      return Response.json({ status: payment.status, emailSent: true }, { headers: { "Cache-Control": "no-store" } });

    try {
      await sendProLicenseEmail(payment.email, payment.name, payment.license_code);
    } catch (cause) {
      const emailError = cause instanceof Error ? cause.message : "The license email could not be sent.";
      return Response.json({ status: payment.status, emailSent: false, emailError }, { headers: { "Cache-Control": "no-store" } });
    }

    try {
      await markLicenseEmailSent(reference);
    } catch {
      return Response.json({
        status: payment.status,
        emailSent: true,
        emailError: "The license email was sent, but its delivery status could not be saved. Avoid resending unless the customer did not receive it."
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ status: payment.status, emailSent: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Payment review could not be saved.";
    return Response.json({ error: message }, { status: 503 });
  }
}
