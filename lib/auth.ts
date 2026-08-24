import { env } from "cloudflare:workers";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_SECONDS,
  createSessionToken,
  readCookie,
  secureTextEqual,
  verifySessionToken,
  type AuthSession,
} from "./auth-core";

type AuthBindings = {
  AUTH_USERNAME?: string;
  AUTH_PASSWORD?: string;
  AUTH_SECRET?: string;
  LOGIN_RATE_LIMITER?: RateLimit;
};

export class AuthConfigurationError extends Error {
  constructor() {
    super("A autenticação do sistema ainda não foi configurada.");
  }
}

function getAuthBindings() {
  const bindings = env as unknown as AuthBindings;
  const username = bindings.AUTH_USERNAME?.trim();
  const password = bindings.AUTH_PASSWORD;
  const secret = bindings.AUTH_SECRET;
  if (!username || !password || !secret || secret.length < 32) {
    throw new AuthConfigurationError();
  }
  return { username, password, secret };
}

export async function authenticateCredentials(username: string, password: string) {
  const config = getAuthBindings();
  const [validUsername, validPassword] = await Promise.all([
    secureTextEqual(username.trim(), config.username),
    secureTextEqual(password, config.password),
  ]);
  return validUsername && validPassword ? config.username : null;
}

export async function allowLoginAttempt(username: string) {
  const limiter = (env as unknown as AuthBindings).LOGIN_RATE_LIMITER;
  if (!limiter) throw new AuthConfigurationError();
  const key = username.trim().toLowerCase() || "empty-username";
  const { success } = await limiter.limit({ key: `login:${key}` });
  return success;
}

export async function issueSessionToken(username: string) {
  const config = getAuthBindings();
  if (!(await secureTextEqual(username, config.username))) {
    throw new AuthConfigurationError();
  }
  return createSessionToken(config.username, config.secret);
}

export async function getSessionFromToken(
  token: string | null | undefined,
): Promise<AuthSession | null> {
  const config = getAuthBindings();
  return verifySessionToken(token, config.secret, config.username);
}

export async function getRequestSession(request: Request) {
  const token = readCookie(request.headers.get("cookie"), AUTH_COOKIE_NAME);
  return getSessionFromToken(token);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function jsonError(error: string, status: number, code: string) {
  return Response.json(
    { error, code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export type ApiAuthorization =
  | { ok: true; username: string }
  | { ok: false; response: Response };

export async function authorizeApiRequest(
  request: Request,
): Promise<ApiAuthorization> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOriginRequest(request)) {
    return {
      ok: false,
      response: jsonError("Origem da requisição não permitida.", 403, "INVALID_ORIGIN"),
    };
  }

  try {
    const session = await getRequestSession(request);
    if (!session) {
      return {
        ok: false,
        response: jsonError("Sua sessão expirou. Entre novamente.", 401, "UNAUTHENTICATED"),
      };
    }
    return { ok: true, username: session.username };
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return {
        ok: false,
        response: jsonError(error.message, 503, "AUTH_NOT_CONFIGURED"),
      };
    }
    throw error;
  }
}

export function createSessionCookie(token: string, secure: boolean) {
  const expires = new Date(Date.now() + AUTH_SESSION_SECONDS * 1000).toUTCString();
  return [
    `${AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${AUTH_SESSION_SECONDS}`,
    `Expires=${expires}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(secure: boolean) {
  return [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
