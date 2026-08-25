import type { Metadata } from "next";
import { OrderDocumentView } from "../../../../components/order-document";

export const metadata: Metadata = {
  title: "Pedido para impressão",
  robots: { index: false, follow: false },
};

export default function PrintableOrderPage() {
  return <OrderDocumentView />;
}
