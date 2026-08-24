import { createReinforcement } from "../../../../../db/storage";
import { apiErrorResponse } from "../../../../../lib/api-response";
import { requestUserLabel } from "../../../../../lib/request-user";
import type { CreateReinforcementPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as CreateReinforcementPayload;
    const reinforcement = await createReinforcement(
      id,
      payload,
      requestUserLabel(request),
    );
    return Response.json({ reinforcement }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
