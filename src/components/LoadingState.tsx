import { Loader2 } from "lucide-react";

export default function LoadingState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-gray-700" aria-hidden="true" />
        <p className="text-sm font-semibold text-gray-950">{message}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-2/3 rounded-full bg-gray-950" />
      </div>
    </div>
  );
}
