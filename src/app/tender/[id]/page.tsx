import Header from "@/components/Header";
import TenderDetailClient from "@/app/tender/[id]/TenderDetailClient";
import { tenderService } from "@/services/TenderService";

export function generateStaticParams() {
  return tenderService.getAllTenderIds().map((id) => ({ id }));
}

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TenderDetailClient id={id} />
      </div>
    </main>
  );
}
