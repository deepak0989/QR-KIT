import {
  adminSessionCookie,
  createAdminSession,
  isAdminLoginConfigured,
  isValidAdminSession,
  verifyAdminCredentials
} from "@/lib/upi-payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminLoginConfigured())
    return Response.json({ error: "Admin login is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ authenticated: isValidAdminSession(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isAdminLoginConfigured())
    return Response.json({ error: "Admin login is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter your admin credentials." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "Enter your admin credentials." }, { status: 400 });

  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== "string" || username.length > 120 ||
      typeof password !== "string" || password.length > 256 ||
      !verifyAdminCredentials(username, password))
    return Response.json({ error: "The username or password is incorrect." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  return Response.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": adminSessionCookie(createAdminSession()) } }
  );
}

export async function DELETE() {
  return Response.json(
    { authenticated: false },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": adminSessionCookie("", true)
      }
    }
  );
}
