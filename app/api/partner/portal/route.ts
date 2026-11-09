import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "@/lib/server-api-url";

const SESSION_COOKIE = "rhema_partner_session";

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
    const response = await fetch(`${getServerApiBaseUrl()}/partnerships/portal.php`, {
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
