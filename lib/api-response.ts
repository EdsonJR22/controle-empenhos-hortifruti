import { DomainError } from "../db/storage";

export function apiErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...error.details,
      },
      { status: error.status },
    );
  }

  console.error("Unexpected API error", error);
  return Response.json(
    { error: "Não foi possível concluir a operação. Tente novamente." },
    { status: 500 },
  );
}
