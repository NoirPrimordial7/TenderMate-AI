"use client";

import { StoredPdfViewer } from "@/components/tender/StoredPdfViewer";
import type { SourceReference } from "@/domain/tender/types";

export function SourceReport({ tenderId, pageCount, source }: { tenderId: string; pageCount?: number | null; source: SourceReference | null }) {
  return <StoredPdfViewer tenderId={tenderId} pageCount={pageCount} source={source}/>;
}
