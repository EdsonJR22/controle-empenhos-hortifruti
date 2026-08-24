import {
  deleteOrder,
  getOrderDetail,
  updateOrder,
} from "../../../../db/storage";
import { apiErrorResponse } from "../../../../lib/api-response";
import { authorizeApiRequest } from "../../../../lib/auth";
import type { CreateOrderPayload } from "../../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    const order = await getOrderDetail(id);
    if (!order) {
      return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    return Response.json({ order }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeApiRequest(request);
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    const payload = (await request.json()) as CreateOrderPayload;
    const order = await updateOrder(id, payload);
    return Response.json({ order });
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
    const order = await deleteOrder(id);
    return Response.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
