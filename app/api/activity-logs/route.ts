import { randomUUID } from "node:crypto";

const PRODUCTION_API_URL = "https://firebrick-snail-772746.hostingersite.com";
const DEVELOPMENT_API_URL = PRODUCTION_API_URL;
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
  if (parsedUrl.hostname === "localruntest.com") {
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

function hasValidVisitorId(input: unknown): input is { visitor_id: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const visitorId = (input as { visitor_id?: unknown }).visitor_id;
  return typeof visitorId === "string"
    && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitorId);
}

async function readLimitedBody(request: Request, maxBytes: number): Promise<ArrayBuffer | null> {
  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

async function handleRequest(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed." }, { status: 405 });
  }

  const attempts = getAuthenticationAttempts(request);
  if (request.method === "GET" && !attempts.length) {
    return Response.json({ success: false, message: "Sign-in is required." }, { status: 401 });
  }

  const requestId = randomUUID();
  try {
    if (request.method === "POST") {
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ success: false, message: "Cross-origin activity records are not accepted." }, { status: 403 });
      }
    }
    const apiBaseUrl = getApiBaseUrl();
    const upstreamUrl = new URL("logs/activity.php", `${apiBaseUrl}/`);
    upstreamUrl.search = new URL(request.url).search;
    let body: ArrayBuffer | undefined;
    if (request.method === "POST") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 2048) {
        return Response.json({ success: false, message: "The activity record is too large." }, { status: 413 });
      }
      body = await readLimitedBody(request, 2048) ?? undefined;
      if (!body) {
        return Response.json({ success: false, message: "The activity record is too large." }, { status: 413 });
      }
      let input: unknown;
      try {
        input = JSON.parse(new TextDecoder().decode(body));
      } catch {
        return Response.json({ success: false, message: "A valid JSON activity record is required." }, { status: 400 });
      }
      if (!hasValidVisitorId(input)) {
        return Response.json({ success: false, message: "A valid activity visitor ID is required." }, { status: 400 });
      }
    }
    let upstreamResponse: Response | undefined;

    const forwardingAttempts: Array<{ authorization?: string; cookie?: string }> = attempts.length ? attempts : [{}];
    for (const attempt of forwardingAttempts) {
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
      if (upstreamResponse.status !== 401 || attempt === forwardingAttempts[forwardingAttempts.length - 1]) break;
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
