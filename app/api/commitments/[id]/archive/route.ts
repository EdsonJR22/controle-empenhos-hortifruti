import {
  archiveCommitment,
  unarchiveCommitment,
} from "../../../../../db/storage";
import { apiErrorResponse } from "../../../../../lib/api-response";
import { authorizeApiRequest } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    const commitment = await archiveCommitment(id, auth.username);
    return Response.json({ commitment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    const commitment = await unarchiveCommitment(id);
    return Response.json({ commitment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
