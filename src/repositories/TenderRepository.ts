import { TenderAnalysis } from "@/domain/tender/types";
import { ITenderRepository } from "@/repositories/interfaces/ITenderRepository";
import cctvInstallationSchool from "@/data/tenders/cctv-installation-school.json";
import desktopComputersPmc from "@/data/tenders/desktop-computers-pmc.json";
import officeFurnitureProcurement from "@/data/tenders/office-furniture-procurement.json";
import roadRepairWard12 from "@/data/tenders/road-repair-ward-12.json";

const tenders = [
  desktopComputersPmc,
  roadRepairWard12,
  officeFurnitureProcurement,
  cctvInstallationSchool
] as TenderAnalysis[];

export class JSONTenderRepository implements ITenderRepository {
  getAllTenders() {
    return tenders;
  }

  getTenderById(id: string) {
    return tenders.find((tender) => tender.id === id);
  }

  getLatestTender() {
    return tenders[0];
  }
}

export const tenderRepository = new JSONTenderRepository();
