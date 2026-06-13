import Link from "next/link";
import { FileSearch, History, LayoutDashboard, Upload } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="TenderMate AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-white">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-gray-950">TenderMate AI</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/history"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">History</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
