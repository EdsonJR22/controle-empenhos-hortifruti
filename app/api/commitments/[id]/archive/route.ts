import {
  archiveCommitment,
  unarchiveCommitment,
} from "../../../../../db/storage";
import { apiErrorResponse } from "../../../../../lib/api-response";
import { requestUserLabel } from "../../../../../lib/request-user";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const commitment = await archiveCommitment(id, requestUserLabel(request));
    return Response.json({ commitment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const commitment = await unarchiveCommitment(id);
    return Response.json({ commitment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
