export const AUTH_COOKIE_NAME = "horticontrol_session";
export const AUTH_SESSION_SECONDS = 12 * 60 * 60;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export type AuthSession = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionPayload = {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padding = (4 - (value.length % 4)) % 4;
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padding);
  try {
    const binary = atob(normalized);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  username: string,
  secret: string,
  nowMilliseconds = Date.now(),
) {
  const issuedAt = Math.floor(nowMilliseconds / 1000);
  const payload: SessionPayload = {
    v: 1,
    sub: username,
    iat: issuedAt,
    exp: issuedAt + AUTH_SESSION_SECONDS,
  };
  const encodedPayload = bytesToBase64Url(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
  secret: string,
  expectedUsername: string,
  nowMilliseconds = Date.now(),
): Promise<AuthSession | null> {
  if (!token || token.length > 4096) return null;
  const segments = token.split(".");
  if (segments.length !== 2) return null;
  const [encodedPayload, encodedSignature] = segments;
  const signature = base64UrlToBytes(encodedSignature);
  const payloadBytes = base64UrlToBytes(encodedPayload);
  if (!signature || !payloadBytes) return null;

  const key = await importHmacKey(secret);
  const validSignature = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    textEncoder.encode(encodedPayload),
  );
  if (!validSignature) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(textDecoder.decode(payloadBytes));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<SessionPayload>;
  const now = Math.floor(nowMilliseconds / 1000);
  if (
    candidate.v !== 1 ||
    candidate.sub !== expectedUsername ||
    typeof candidate.iat !== "number" ||
    typeof candidate.exp !== "number" ||
    !Number.isInteger(candidate.iat) ||
    !Number.isInteger(candidate.exp) ||
    candidate.iat > now + 60 ||
    candidate.exp <= now ||
    candidate.exp <= candidate.iat ||
    candidate.exp - candidate.iat !== AUTH_SESSION_SECONDS
  ) {
    return null;
  }

  return {
    username: candidate.sub,
    issuedAt: candidate.iat,
    expiresAt: candidate.exp,
  };
}

export async function secureTextEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(left)),
    crypto.subtle.digest("SHA-256", textEncoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    return value || null;
  }
  return null;
}

function isUnsafeReturnValue(value: string) {
  return (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  );
}

export function sanitizeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 2048) return "/";
  let inspected = value.trim();
  if (isUnsafeReturnValue(inspected)) return "/";

  for (let round = 0; round < 2; round += 1) {
    try {
      inspected = decodeURIComponent(inspected);
    } catch {
      return "/";
    }
    if (isUnsafeReturnValue(inspected)) return "/";
  }

  try {
    const base = new URL("https://horticontrol.invalid");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return "/";
    if (
      target.pathname === "/login" ||
      target.pathname === "/login/" ||
      target.pathname.startsWith("/api/auth/")
    ) {
      return "/";
    }
    return `${target.pathname}${target.search}`;
  } catch {
    return "/";
  }
}
