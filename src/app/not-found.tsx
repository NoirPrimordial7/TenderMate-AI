import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <p className="muted-label">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">The tender analysis page you requested is not available.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
        >
          Go to upload
        </Link>
      </div>
    </main>
  );
}
