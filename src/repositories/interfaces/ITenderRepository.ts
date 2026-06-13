import { TenderAnalysis } from "@/domain/tender/types";

export interface ITenderRepository {
  getAllTenders(): TenderAnalysis[];
  getTenderById(id: string): TenderAnalysis | undefined;
  getLatestTender(): TenderAnalysis;
}
