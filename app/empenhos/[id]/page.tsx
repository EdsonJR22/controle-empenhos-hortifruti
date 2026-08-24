import type { Metadata } from "next";
import { CommitmentDetailView } from "../../../components/commitment-detail";

export const metadata: Metadata = {
  title: "Detalhes da NE",
};

export default function CommitmentPage() {
  return <CommitmentDetailView />;
}
