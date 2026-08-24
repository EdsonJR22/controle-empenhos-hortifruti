import {
  clearSessionCookie,
  isSameOriginRequest,
} from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Origem da requisição não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/login", request.url).toString(),
      "Set-Cookie": clearSessionCookie(
        new URL(request.url).protocol === "https:",
      ),
      "Cache-Control": "private, no-store",
    },
  });
}
