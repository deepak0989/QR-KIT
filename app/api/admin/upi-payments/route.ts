import { isValidAdminToken, listPayments, updatePaymentStatus } from "@/lib/upi-payments";

export const runtime = "nodejs";

function unauthorized() {
  const configured = Boolean(process.env.PRO_ADMIN_TOKEN);
  return Response.json(
    { error: configured ? "Admin authorization failed." : "Admin access is not configured." },
    { status: configured ? 401 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: Request) {
  if (!isValidAdminToken(request)) return unauthorized();
  try {
    return Response.json({ payments: await listPayments() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Payment storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!isValidAdminToken(request)) return unauthorized();
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
  } catch {
    return Response.json({ error: "Payment review could not be saved." }, { status: 503 });
  }
}
