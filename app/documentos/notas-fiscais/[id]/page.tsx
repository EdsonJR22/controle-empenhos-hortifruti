import type { Metadata } from "next";
import { OrderDocumentView } from "../../../../components/order-document";

export const metadata: Metadata = {
  title: "Espelho de NF para impressão",
  robots: { index: false, follow: false },
};

export default function PrintableInvoicePage() {
  return <OrderDocumentView mode="invoice" />;
}
