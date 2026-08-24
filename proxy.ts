import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getRequestSession,
} from "./lib/auth";
import { sanitizeReturnPath } from "./lib/auth-core";

const publicRoutes = new Set([
  "/api/auth/login",
  "/api/auth/logout",
]);

function noStore(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function loginRedirect(request: NextRequest, configurationError = false) {
  const loginUrl = new URL("/login", request.url);
  if (configurationError) {
    loginUrl.searchParams.set("error", "configuration");
  } else {
    const returnPath = sanitizeReturnPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    if (returnPath !== "/") loginUrl.searchParams.set("next", returnPath);
  }
  return noStore(NextResponse.redirect(loginUrl));
}

function apiError(error: string, status: number, code: string) {
  return Response.json(
    { error, code },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login" || pathname === "/login/";
  if (publicRoutes.has(pathname)) return NextResponse.next();

  let session = null;
  try {
    session = await getRequestSession(request);
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
    if (isLoginPage) return noStore(NextResponse.next());
    if (pathname.startsWith("/api/")) {
      return apiError(error.message, 503, "AUTH_NOT_CONFIGURED");
    }
    return loginRedirect(request, true);
  }

  if (isLoginPage) {
    return session
      ? noStore(NextResponse.redirect(new URL("/", request.url)))
      : noStore(NextResponse.next());
  }

  if (session) return noStore(NextResponse.next());
  if (pathname.startsWith("/api/")) {
    return apiError(
      "Sua sessão expirou. Entre novamente.",
      401,
      "UNAUTHENTICATED",
    );
  }
  return loginRedirect(request);
}

export const config = {
  matcher: ["/((?!_next|assets/|favicon.ico|favicon.svg|og.png).*)"],
};
