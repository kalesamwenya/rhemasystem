import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "@/lib/server-api-url";

const SESSION_COOKIE = "rhema_partner_session";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
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

  let response: Response;
  try {
    response = await fetch(`${getServerApiBaseUrl()}/partnerships/auth.php`, {
      method: "POST",
      headers,
      body: payload,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Partner authentication request failed.", error);
    return Response.json({ success: false, message: "Partner authentication service unavailable." }, { status: 502 });
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Partner authentication service returned a non-JSON response.", error);
    return Response.json({ success: false, message: "Partner authentication service returned an invalid response." }, { status: 502 });
  }

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
}
