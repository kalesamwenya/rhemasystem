import { cookies } from "next/headers";

const SESSION_COOKIE = "rhema_partner_session";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "https://systemtest.citydrivehire.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ success: false, message: "This request origin is not allowed." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const payload = await request.text();
  let action = "";
  try {
    const parsed = JSON.parse(payload);
    action = typeof parsed.action === "string" ? parsed.action : "";
  } catch {
    return Response.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: request.headers.get("origin") || new URL(request.url).origin,
  };
  const existingToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (action === "logout" && existingToken) headers.Authorization = `Bearer ${existingToken}`;

  try {
    const response = await fetch(`${apiBaseUrl()}/partnerships/auth.php`, {
      method: "POST",
      headers,
      body: payload,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      return Response.json(data, { status: response.status });
    }

    if (action === "logout") {
      cookieStore.delete(SESSION_COOKIE);
      return Response.json({ success: true, message: data.message });
    }

    if (typeof data.token !== "string") {
      return Response.json({ success: false, message: "Partner authentication returned an invalid session." }, { status: 502 });
    }
    cookieStore.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return Response.json({ success: true, partner: data.partner }, { status: response.status });
  } catch {
    return Response.json({ success: false, message: "Partner authentication service unavailable." }, { status: 502 });
  }
}
