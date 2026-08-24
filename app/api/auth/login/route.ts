import {
  allowLoginAttempt,
  AuthConfigurationError,
  authenticateCredentials,
  createSessionCookie,
  isSameOriginRequest,
  issueSessionToken,
} from "../../../../lib/auth";
import { sanitizeReturnPath } from "../../../../lib/auth-core";

export const dynamic = "force-dynamic";

const MAX_LOGIN_BODY_BYTES = 4096;

async function readLoginForm(request: Request) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded" || !request.body) {
    return { status: "invalid" as const };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_LOGIN_BODY_BYTES) {
      await reader.cancel();
      return { status: "too-large" as const };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    status: "ok" as const,
    values: new URLSearchParams(new TextDecoder().decode(body)),
  };
}

function redirectToLogin(request: Request, error: string, returnPath: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  if (returnPath !== "/") url.searchParams.set("next", returnPath);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Origem da requisição não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_LOGIN_BODY_BYTES) {
    return Response.json(
      { error: "Requisição muito grande." },
      { status: 413, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let form;
  try {
    form = await readLoginForm(request);
  } catch {
    return redirectToLogin(request, "request", "/");
  }

  if (form.status === "too-large") {
    return Response.json(
      { error: "Requisição muito grande." },
      { status: 413, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (form.status === "invalid") {
    return redirectToLogin(request, "request", "/");
  }

  const username = String(form.values.get("username") ?? "").slice(0, 128);
  const password = String(form.values.get("password") ?? "").slice(0, 512);
  const returnPath = sanitizeReturnPath(form.values.get("next"));

  try {
    if (!(await allowLoginAttempt(username))) {
      return Response.json(
        { error: "Muitas tentativas de acesso. Aguarde um minuto e tente novamente." },
        {
          status: 429,
          headers: {
            "Cache-Control": "private, no-store",
            "Retry-After": "60",
          },
        },
      );
    }

    const authenticatedUsername = await authenticateCredentials(username, password);
    if (!authenticatedUsername) {
      return redirectToLogin(request, "invalid", returnPath);
    }

    const token = await issueSessionToken(authenticatedUsername);
    const target = new URL(returnPath, request.url);
    return new Response(null, {
      status: 303,
      headers: {
        Location: target.toString(),
        "Set-Cookie": createSessionCookie(
          token,
          new URL(request.url).protocol === "https:",
        ),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return redirectToLogin(request, "configuration", returnPath);
    }
    throw error;
  }
}
