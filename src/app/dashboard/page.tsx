import Header from "@/components/Header";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { tenderService } from "@/services/TenderService";

export default function DashboardPage() {
  const tender = tenderService.getDashboardTender();

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TenderAnalysisView analysis={tender} />
      </div>
    </main>
  );
}
