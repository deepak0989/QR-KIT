import { createPayment } from "@/lib/upi-payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter the payment details and try again." }, { status: 400 });
  }

  if (!body || typeof body !== "object")
    return Response.json({ error: "Payment details are required." }, { status: 400 });
  const { name, email, utr } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80)
    return Response.json({ error: "Enter your name (2–80 characters)." }, { status: 400 });
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (typeof utr !== "string" || !/^[A-Za-z0-9-]{6,35}$/.test(utr.trim()))
    return Response.json({ error: "Enter the UPI transaction reference shown in your payment app." }, { status: 400 });

  try {
    const result = await createPayment({ name, email, utr });
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The payment request could not be saved.";
    const status = message.includes("already submitted") ? 409 : 503;
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
