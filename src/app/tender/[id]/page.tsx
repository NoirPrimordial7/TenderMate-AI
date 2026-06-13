import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { tenderService } from "@/services/TenderService";

export function generateStaticParams() {
  return tenderService.getAllTenderIds().map((id) => ({ id }));
}

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = tenderService.getTenderDetails(id);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {analysis ? (
          <TenderAnalysisView analysis={analysis} />
        ) : (
          <EmptyState
            title="Tender analysis not found"
            description="This mock tender ID does not match any saved analysis. Open history to choose an available tender."
            actionHref="/history"
            actionLabel="View history"
          />
        )}
      </div>
    </main>
  );
}
