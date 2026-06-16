import Header from "@/components/Header";
import UploadCard from "@/components/UploadCard";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <UploadCard />
      </div>
    </main>
  );
}
