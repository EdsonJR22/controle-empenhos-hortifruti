import type { Metadata } from "next";
import { ArchivedCommitments } from "../../components/archived-commitments";

export const metadata: Metadata = {
  title: "NEs arquivadas",
};

export default function ArchivedCommitmentsPage() {
  return <ArchivedCommitments />;
}
