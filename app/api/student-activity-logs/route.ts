import { randomUUID } from "node:crypto";

const PRODUCTION_API_URL = "https://firebrick-snail-772746.hostingersite.com";
const SESSION_COOKIE_NAMES = new Set(["rhema_admin_session", "rhema_student_session"]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL;
  const parsedUrl = new URL(configuredUrl.trim());
  if (parsedUrl.hostname === "localruntest.com") return PRODUCTION_API_URL;
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The student activity API URL must use HTTP or HTTPS.");
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
  if (!attempts.length) {
    return Response.json({ success: false, message: "Sign-in is required." }, { status: 401 });
  }

  const requestId = randomUUID();
  try {
    if (request.method === "POST") {
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ success: false, message: "Cross-origin student activity requests are not accepted." }, { status: 403 });
      }
    }

    const apiBaseUrl = getApiBaseUrl();
    const upstreamUrl = new URL("logs/studentLearningActivity.php", `${apiBaseUrl}/`);
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
    }

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

    if (!upstreamResponse) throw new Error("The student activity request was not forwarded.");
    const responseText = await upstreamResponse.text();
    let responseBody: unknown;
    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      if (upstreamResponse.status === 404) {
        return Response.json(
          {
            success: false,
            message: "The student activity PHP endpoint was not found. Deploy logs/studentLearningActivity.php and the updated PHP API configuration.",
            request_id: requestId,
          },
          { status: 502 },
        );
      }
      console.error("Student activity PHP API returned a non-JSON response.", {
        requestId,
        status: upstreamResponse.status,
        contentType: upstreamResponse.headers.get("content-type"),
      });
      return Response.json(
        {
          success: false,
          message: "The student activity PHP API returned an invalid response. Check its deployment and server error log.",
          request_id: requestId,
        },
        { status: 502 },
      );
    }

    return Response.json(responseBody, {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    console.error("Student activity proxy request failed.", { requestId, error });
    return Response.json(
      {
        success: false,
        message: "The student activity service could not complete the request.",
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
