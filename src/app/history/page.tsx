import Header from "@/components/Header";
import HistoryClient from "@/app/history/HistoryClient";

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HistoryClient />
      </div>
    </main>
  );
}
