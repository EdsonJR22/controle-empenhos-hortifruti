export function requestUserLabel(request: Request): string {
  return (
    request.headers.get("cf-access-authenticated-user-email")?.trim() ||
    "Usuário"
  );
}
