import { ExternalLink } from "lucide-react";
import { SourceReference } from "@/domain/tender/types";

type SourceButtonProps = {
  source: SourceReference;
  onSelect: (source: SourceReference) => void;
};

export default function SourceButton({ source, onSelect }: SourceButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(source)}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
      aria-label={`View source on page ${source.page}, clause ${source.clause}`}
    >
      View Source
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
