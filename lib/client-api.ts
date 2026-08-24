"use client";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    const returnPath = `${window.location.pathname}${window.location.search}`;
    const loginUrl = new URL("/login", window.location.origin);
    if (returnPath !== "/") loginUrl.searchParams.set("next", returnPath);
    window.location.assign(loginUrl.toString());
  }
  return response;
}
