import Header from "@/components/Header";
import HistoryTable from "@/components/HistoryTable";
import { tenderService } from "@/services/TenderService";

export default function HistoryPage() {
  const history = tenderService.getTenderHistory();

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HistoryTable items={history} />
      </div>
    </main>
  );
}
