import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_SECONDS,
  createSessionToken,
  readCookie,
  sanitizeReturnPath,
  secureTextEqual,
  verifySessionToken,
} from "../lib/auth-core.ts";

const secret = "session-secret-for-tests-with-more-than-thirty-two-characters";
const username = "operador";
const now = Date.UTC(2026, 7, 24, 12, 0, 0);

test("creates and verifies a signed session until its exact expiry", async () => {
  const token = await createSessionToken(username, secret, now);
  const session = await verifySessionToken(token, secret, username, now);

  assert.equal(session?.username, username);
  assert.equal(session?.expiresAt - session?.issuedAt, AUTH_SESSION_SECONDS);
  assert.ok(
    await verifySessionToken(
      token,
      secret,
      username,
      now + AUTH_SESSION_SECONDS * 1000 - 1,
    ),
  );
  assert.equal(
    await verifySessionToken(
      token,
      secret,
      username,
      now + AUTH_SESSION_SECONDS * 1000,
    ),
    null,
  );
});

test("rejects altered, malformed or mismatched sessions", async () => {
  const token = await createSessionToken(username, secret, now);
  const [payload, signature] = token.split(".");
  const changedPayload = `${payload[0] === "A" ? "B" : "A"}${payload.slice(1)}`;
  const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;

  assert.equal(
    await verifySessionToken(`${changedPayload}.${signature}`, secret, username, now),
    null,
  );
  assert.equal(
    await verifySessionToken(`${payload}.${changedSignature}`, secret, username, now),
    null,
  );
  assert.equal(await verifySessionToken(token, `${secret}-wrong`, username, now), null);
  assert.equal(await verifySessionToken(token, secret, "outro", now), null);
  assert.equal(await verifySessionToken("invalid", secret, username, now), null);
  assert.equal(await verifySessionToken("a.b.c", secret, username, now), null);
  assert.equal(await verifySessionToken(null, secret, username, now), null);
});

test("compares credentials without an early string comparison", async () => {
  assert.equal(await secureTextEqual("senha-forte", "senha-forte"), true);
  assert.equal(await secureTextEqual("senha-forte", "senha-errada"), false);
});

test("reads only the exact session cookie name", () => {
  const header = `theme=dark; prefix_${AUTH_COOKIE_NAME}=wrong; ${AUTH_COOKIE_NAME}=token-value`;
  assert.equal(readCookie(header, AUTH_COOKIE_NAME), "token-value");
  assert.equal(readCookie(header, "missing"), null);
  assert.equal(readCookie(null, AUTH_COOKIE_NAME), null);
});

test("allows only internal and unambiguous return paths", () => {
  assert.equal(sanitizeReturnPath("/empenhos/abc?tab=itens"), "/empenhos/abc?tab=itens");
  assert.equal(sanitizeReturnPath("/"), "/");
  assert.equal(sanitizeReturnPath("https://evil.example"), "/");
  assert.equal(sanitizeReturnPath("//evil.example/path"), "/");
  assert.equal(sanitizeReturnPath("/\\evil.example"), "/");
  assert.equal(sanitizeReturnPath("/%5cevil.example"), "/");
  assert.equal(sanitizeReturnPath("/%252f%252fevil.example"), "/");
  assert.equal(sanitizeReturnPath("/login"), "/");
  assert.equal(sanitizeReturnPath("/login/"), "/");
  assert.equal(sanitizeReturnPath("/api/auth/login"), "/");
  assert.equal(sanitizeReturnPath("javascript:alert(1)"), "/");
});
