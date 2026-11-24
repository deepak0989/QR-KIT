import { isValidLicense } from "@/lib/upi-payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a valid Pro license code." }, { status: 400 });
  }
  const code = body && typeof body === "object" ? (body as Record<string, unknown>).code : null;
  if (typeof code !== "string" || code.length > 256)
    return Response.json({ error: "Enter a valid Pro license code." }, { status: 400 });
  try {
    if (!(await isValidLicense(code.trim())))
      return Response.json({ error: "This Pro code is invalid or its payment has not been approved." }, { status: 403 });
    return Response.json({ valid: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Pro license validation is temporarily unavailable.";
    return Response.json({ error: message }, { status: 503 });
  }
}
