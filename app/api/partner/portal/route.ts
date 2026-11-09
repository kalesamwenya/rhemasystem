import { cookies } from "next/headers";

const SESSION_COOKIE = "rhema_partner_session";

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "https://systemtest.citydrivehire.com").replace(/\/$/, "");
}

async function forward(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return Response.json({ success: false, message: "Partner sign-in is required." }, { status: 401 });
  }

  const body = request.method === "GET" ? undefined : await request.text();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Origin: request.headers.get("origin") || new URL(request.url).origin,
  };
  if (body) headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(`${apiBaseUrl()}/partnerships/portal.php`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json({ success: false, message: "Partner workspace service unavailable." }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
