import { getCommitmentDetail } from "../../../../db/storage";
import { apiErrorResponse } from "../../../../lib/api-response";
import { authorizeApiRequest } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    const commitment = await getCommitmentDetail(id);
    if (!commitment) {
      return Response.json({ error: "NE não encontrada." }, { status: 404 });
    }
    return Response.json({ commitment }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
