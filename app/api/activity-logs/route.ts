import { randomUUID } from "node:crypto";

const PRODUCTION_API_URL = "https://firebrick-snail-772746.hostingersite.com";
const DEVELOPMENT_API_URL = "http://localruntest.com";
const SESSION_COOKIE_NAMES = new Set([
  "rhema_admin_session",
  "rhema_lecturer_session",
  "rhema_student_session",
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL
    || (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);
  const parsedUrl = new URL(configuredUrl.trim());
  if (process.env.NODE_ENV === "production" && parsedUrl.hostname === "localruntest.com") {
    return PRODUCTION_API_URL;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The activity log API URL must use HTTP or HTTPS.");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

function getAuthenticationAttempts(request: Request) {
  const attempts: Array<{ authorization?: string; cookie?: string }> = [];
  const seen = new Set<string>();
  const addToken = (value: string | null) => {
    if (!value) return;
    const token = value.replace(/^Bearer\s+/i, "").trim();
    const normalized = token.toLowerCase();
    if (!/^[a-f0-9]{64}$/i.test(token) || seen.has(normalized)) return;
    seen.add(normalized);
    attempts.push({ authorization: `Bearer ${token}` });
  };

  addToken(request.headers.get("authorization"));
  addToken(request.headers.get("x-auth-token"));
  for (const cookie of (request.headers.get("cookie") || "").split(";").map((item) => item.trim())) {
    const separator = cookie.indexOf("=");
    if (separator < 1 || !SESSION_COOKIE_NAMES.has(cookie.slice(0, separator))) continue;
    const token = cookie.slice(separator + 1);
    if (!/^[a-f0-9]{64}$/i.test(token) || seen.has(token.toLowerCase())) continue;
    seen.add(token.toLowerCase());
    attempts.push({ cookie });
  }
  return attempts;
}

async function handleRequest(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed." }, { status: 405 });
  }

  const attempts = getAuthenticationAttempts(request);
  if (!attempts.length) {
    return Response.json({ success: false, message: "Sign-in is required." }, { status: 401 });
  }

  const requestId = randomUUID();
  try {
    const apiBaseUrl = getApiBaseUrl();
    const upstreamUrl = new URL("logs/activity.php", `${apiBaseUrl}/`);
    upstreamUrl.search = new URL(request.url).search;
    const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
    let upstreamResponse: Response | undefined;

    for (const attempt of attempts) {
      const headers = new Headers({
        Accept: "application/json",
        Origin: new URL(apiBaseUrl).origin,
        "X-Request-ID": requestId,
      });
      if (attempt.authorization) headers.set("Authorization", attempt.authorization);
      if (attempt.cookie) headers.set("Cookie", attempt.cookie);
      if (request.method === "POST") headers.set("Content-Type", "application/json");

      upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (upstreamResponse.status !== 401 || attempt === attempts[attempts.length - 1]) break;
      await upstreamResponse.body?.cancel();
    }

    if (!upstreamResponse) throw new Error("The activity log request was not forwarded.");
    return new Response(await upstreamResponse.arrayBuffer(), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    console.error("Activity log proxy request failed.", { requestId, error });
    return Response.json(
      {
        success: false,
        message: "The activity log service could not complete the request.",
        request_id: requestId,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
