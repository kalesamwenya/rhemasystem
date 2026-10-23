import { randomUUID } from "node:crypto";

const PRODUCTION_API_URL = "https://firebrick-snail-772746.hostingersite.com";
const DEVELOPMENT_API_URL = "http://localruntest.com";
const GET_ACTIONS = new Set(["bootstrap", "contacts", "messages", "searchMessages", "attachment"]);
const SESSION_COOKIE_NAMES = new Set([
  "rhema_admin_session",
  "rhema_lecturer_session",
  "rhema_student_session",
]);
const UPSTREAM_TIMEOUT_MS = 20_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getApiBaseUrl() {
  const configuredUrl = process.env.COMMUNICATIONS_API_URL
    || process.env.NEXT_PUBLIC_API_URL
    || (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);
  const parsedUrl = new URL(configuredUrl.trim());

  if (process.env.NODE_ENV === "production" && parsedUrl.hostname === "localruntest.com") {
    return PRODUCTION_API_URL;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The communications API URL must use HTTP or HTTPS.");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

function getSessionCookies(cookieHeader: string | null) {
  return (cookieHeader || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const separator = cookie.indexOf("=");
      return separator > 0
        && SESSION_COOKIE_NAMES.has(cookie.slice(0, separator))
        && /^[a-f0-9]{64}$/i.test(cookie.slice(separator + 1));
    });
}

function getAuthenticationAttempts(request: Request) {
  const attempts: Array<{ authorization?: string; cookie?: string }> = [];
  const seenTokens = new Set<string>();
  const addBearerToken = (value: string | null) => {
    if (!value) return;
    const token = value.replace(/^Bearer\s+/i, "").trim();
    if (!/^[a-f0-9]{64}$/i.test(token) || seenTokens.has(token.toLowerCase())) return;
    seenTokens.add(token.toLowerCase());
    attempts.push({ authorization: `Bearer ${token}` });
  };

  addBearerToken(request.headers.get("authorization"));
  addBearerToken(request.headers.get("x-auth-token"));
  for (const cookie of getSessionCookies(request.headers.get("cookie"))) {
    const token = cookie.slice(cookie.indexOf("=") + 1);
    if (seenTokens.has(token.toLowerCase())) continue;
    seenTokens.add(token.toLowerCase());
    attempts.push({ cookie });
  }
  return attempts;
}

async function handleCommunicationsRequest(request: Request) {
  const requestId = randomUUID();
  const requestUrl = new URL(request.url);
  if (request.method === "GET") {
    const action = requestUrl.searchParams.get("action") || "bootstrap";
    if (!GET_ACTIONS.has(action)) {
      return Response.json({ success: false, message: "Unknown communications action." }, { status: 400 });
    }
  } else if (request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed." }, { status: 405 });
  }

  const authenticationAttempts = getAuthenticationAttempts(request);
  if (authenticationAttempts.length === 0) {
    return Response.json({ success: false, message: "Sign-in is required." }, { status: 401 });
  }

  const errorReference = randomUUID();
  try {
    const apiBaseUrl = getApiBaseUrl();
    const upstreamUrl = new URL("communications/index.php", `${apiBaseUrl}/`);
    upstreamUrl.search = requestUrl.search;

    const headers = new Headers({
      Accept: request.headers.get("accept") || "application/json",
      Origin: new URL(apiBaseUrl).origin,
    });
    headers.set("X-Request-ID", requestId);

    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);

    const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
    let response: Response | undefined;
    for (const attempt of authenticationAttempts) {
      const attemptHeaders = new Headers(headers);
      if (attempt.authorization) attemptHeaders.set("Authorization", attempt.authorization);
      if (attempt.cookie) attemptHeaders.set("Cookie", attempt.cookie);

      response = await fetch(upstreamUrl, {
        method: request.method,
        headers: attemptHeaders,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (response.status !== 401 || attempt === authenticationAttempts[authenticationAttempts.length - 1]) break;
      await response.body?.cancel();
    }
    if (!response) throw new Error("No communications authentication attempt was made.");
    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-ID": requestId,
    });
    for (const headerName of ["content-type", "content-disposition"]) {
      const value = response.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    }

    if (response.status >= 500) {
      console.error("Communications upstream returned a server error.", {
        requestId,
        status: response.status,
      });
    }

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Communications proxy request failed.", { requestId, error });
    return Response.json(
      {
        success: false,
        message: "The communications service could not complete the request.",
        error_reference: errorReference,
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

export const GET = handleCommunicationsRequest;
export const POST = handleCommunicationsRequest;
