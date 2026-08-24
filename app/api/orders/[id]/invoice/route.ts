import { upsertInvoice } from "../../../../../db/storage";
import { apiErrorResponse } from "../../../../../lib/api-response";
import { requestUserLabel } from "../../../../../lib/request-user";
import type { CreateInvoicePayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as CreateInvoicePayload;
    const invoice = await upsertInvoice(id, payload, requestUserLabel(request));
    return Response.json({ invoice });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
