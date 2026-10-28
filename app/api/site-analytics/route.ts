import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

const PRODUCTION_API_URL = "https://firebrick-snail-772746.hostingersite.com";
const DEVELOPMENT_API_URL = "http://localruntest.com";

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
    throw new Error("The website analytics API URL must use HTTP or HTTPS.");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

async function handleRequest(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed." }, { status: 405 });
  }

  const requestId = randomUUID();
  try {
    const apiBaseUrl = getApiBaseUrl();
    const upstreamUrl = new URL("logs/websiteAnalytics.php", `${apiBaseUrl}/`);
    if (request.method === "GET") upstreamUrl.search = new URL(request.url).search;

    const headers = new Headers({
      Accept: "application/json",
      Origin: new URL(apiBaseUrl).origin,
      "X-Request-ID": requestId,
    });
    if (request.method === "GET") {
      const authorization = request.headers.get("authorization") || "";
      if (/^Bearer\s+[a-f0-9]{64}$/i.test(authorization.trim())) {
        headers.set("Authorization", authorization.trim());
      }
      const adminCookie = (request.headers.get("cookie") || "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => /^rhema_admin_session=[a-f0-9]{64}$/i.test(part));
      if (adminCookie) headers.set("Cookie", adminCookie);
    }

    let body: ArrayBuffer | undefined;
    if (request.method === "POST") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 2048) {
        return Response.json({ success: false, message: "The analytics event is too large." }, { status: 413 });
      }
      body = await request.arrayBuffer();
      if (body.byteLength > 2048) {
        return Response.json({ success: false, message: "The analytics event is too large." }, { status: 413 });
      }
      headers.set("Content-Type", "application/json");
      const forwardedHeaders = [
        request.headers.get("cf-connecting-ip"),
        request.headers.get("x-vercel-forwarded-for"),
        request.headers.get("x-real-ip"),
        request.headers.get("x-forwarded-for"),
      ];
      const clientIp = forwardedHeaders
        .flatMap((value) => value?.split(",") || [])
        .map((value) => value.trim())
        .find((value) => isIP(value));
      if (clientIp) headers.set("X-Analytics-Client-IP", clientIp);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const responseBody = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") || "";
    let jsonBody: unknown;
    try {
      jsonBody = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      console.error("Website analytics PHP API returned a non-JSON response.", {
        requestId,
        status: upstreamResponse.status,
        contentType,
      });
      return Response.json(
        {
          success: false,
          message: upstreamResponse.status === 404
            ? "The website analytics PHP endpoint was not found. Deploy logs/websiteAnalytics.php to the configured PHP API host."
            : "The website analytics PHP API returned an invalid response. Check the PHP API deployment and server error log.",
          request_id: requestId,
          upstream_status: upstreamResponse.status,
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

    return Response.json(jsonBody, {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    console.error("Website analytics proxy request failed.", { requestId, error });
    return Response.json(
      {
        success: false,
        message: "The website analytics service could not complete the request.",
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
