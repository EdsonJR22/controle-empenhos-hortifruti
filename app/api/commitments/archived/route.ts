import { getArchivedCommitments } from "../../../../db/storage";
import { apiErrorResponse } from "../../../../lib/api-response";
import { authorizeApiRequest } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const data = await getArchivedCommitments();
    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
