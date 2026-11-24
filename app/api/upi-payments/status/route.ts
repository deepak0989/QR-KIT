import { getPaymentStatus } from "@/lib/upi-payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter your payment reference and check again." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "Payment details are required." }, { status: 400 });

  const { reference, accessKey } = body as Record<string, unknown>;
  if (typeof reference !== "string" || !/^[A-F0-9]{12}$/.test(reference) ||
      typeof accessKey !== "string" || accessKey.length < 32 || accessKey.length > 128)
    return Response.json({ error: "Payment reference and access key are required." }, { status: 400 });
  try {
    const result = await getPaymentStatus(reference, accessKey);
    if (!result) return Response.json({ error: "Payment request was not found. Check the reference and try again." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Payment status is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
