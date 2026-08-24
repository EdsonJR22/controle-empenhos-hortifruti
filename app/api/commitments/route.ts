import { createCommitment } from "../../../db/storage";
import { apiErrorResponse } from "../../../lib/api-response";
import { authorizeApiRequest } from "../../../lib/auth";
import type { CreateCommitmentPayload } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const payload = (await request.json()) as CreateCommitmentPayload;
    const commitment = await createCommitment(payload, auth.username);
    return Response.json({ commitment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
