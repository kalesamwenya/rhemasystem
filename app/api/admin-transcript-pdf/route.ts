import { randomUUID } from "node:crypto";
import { getServerApiBaseUrl } from "@/lib/server-api-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const studentId = new URL(request.url).searchParams.get("student_id")?.trim() || "";
  if (!studentId || studentId.length > 50) {
    return Response.json({ success: false, message: "A valid student ID is required." }, { status: 400 });
  }

  const upstream = new URL("students/getAdminTranscriptPdf.php", `${getServerApiBaseUrl()}/`);
  upstream.searchParams.set("student_id", studentId);

  const headers = new Headers({
    Accept: "application/pdf",
    Origin: new URL(getServerApiBaseUrl()).origin,
    "X-Request-Id": requestId,
  });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  try {
    const response = await fetch(upstream, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const body = await response.text();
      let message = "The stored transcript PDF is unavailable.";
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {}
      return Response.json({ success: false, message }, {
        status: response.status,
        headers: { "X-Request-Id": requestId },
      });
    }

    const pdf = await response.arrayBuffer();
    if (pdf.byteLength < 8) {
      return Response.json({ success: false, message: "The stored transcript PDF is empty." }, { status: 502 });
    }
    const signature = new TextDecoder("latin1").decode(new Uint8Array(pdf, 0, 5));
    if (signature !== "%PDF-") {
      return Response.json({ success: false, message: "The stored transcript is not a valid PDF." }, { status: 502 });
    }

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": response.headers.get("content-disposition") || `inline; filename="Emit-Academy-Transcript-${studentId}.pdf"`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("Transcript PDF proxy failed.", { requestId, error });
    return Response.json(
      { success: false, message: "Unable to open the stored transcript PDF.", request_id: requestId },
      { status: 502, headers: { "X-Request-Id": requestId } },
    );
  }
}
