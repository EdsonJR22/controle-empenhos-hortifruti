import { createCommitment } from "../../../db/storage";
import { apiErrorResponse } from "../../../lib/api-response";
import { requestUserLabel } from "../../../lib/request-user";
import type { CreateCommitmentPayload } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateCommitmentPayload;
    const commitment = await createCommitment(
      payload,
      requestUserLabel(request),
    );
    return Response.json({ commitment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
