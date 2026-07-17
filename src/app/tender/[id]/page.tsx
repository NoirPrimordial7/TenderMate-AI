import TenderDetailClient from "@/app/tender/[id]/TenderDetailClient";
import { ApplicationShell } from "@/components/shell/ApplicationShell";

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ApplicationShell><TenderDetailClient id={id} /></ApplicationShell>;
}
