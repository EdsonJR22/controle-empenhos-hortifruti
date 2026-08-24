import { getCommitmentDetail } from "../../../../db/storage";
import { apiErrorResponse } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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
