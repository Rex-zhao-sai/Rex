export interface PhotoRecord {
  id: string;
  type: "before" | "after";
  dataUrl: string;
  timestamp: string; // ISO string
  fileName: string;
}

export interface PhotoPair {
  id: string;
  before: PhotoRecord | null;
  after: PhotoRecord | null;
}

export interface MaintenanceRecord {
  equipmentId: string;
  month: string; // e.g. "2025-07"
  photoPairs: PhotoPair[];
  notes: string;
  technician: string;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  name: string;
}

export const EQUIPMENT_LIST: Equipment[] = [
  { id: "tkp-ict", name: "TKP ICT" },
  { id: "tkp-per-fct", name: "TKP PER-FCT" },
  { id: "tkp-hot-epe", name: "TKP HOT-EPE" },
  { id: "tkp-eol", name: "TKP EOL" },
  { id: "tkp-run-in", name: "TKP run in" },
  { id: "bs3g-ict", name: "BS3G ICT" },
  { id: "bs3g-epe", name: "BS3G EPE" },
  { id: "infolight", name: "Infolight" },
  { id: "dmi-epe", name: "DMI EPE" },
  { id: "dmi-ict", name: "DMI ICT" },
  { id: "zkw1050-mcl-epe", name: "ZKW1050 MCL EPE" },
  { id: "zkw1060-mcl-1", name: "ZKW1060 MCL-1" },
  { id: "zkw1060-mcl-2", name: "ZKW1060 MCL-2" },
  { id: "zkw1295", name: "ZKW1295" },
  { id: "zkw1271", name: "ZKW1271" },
  { id: "zkw1296-base-r", name: "ZKW1296-Base R" },
  { id: "zkw1296-base-l", name: "ZKW1296-Base L" },
  { id: "zkw1296-sa-l", name: "ZKW1296-SA L" },
  { id: "zkw1296-sa-r", name: "ZKW1296-SA R" },
  { id: "zkw1296-corner-light", name: "ZKW1296-Corner-Light" },
  { id: "zkw1296-citg-light", name: "ZKW1296-Citg-Light" },
  { id: "zkw1105-led", name: "ZKW1105 LED" },
  { id: "zkw1050lwr-1105-lwr-epe", name: "ZKW1050LWR/1105 LWR EPE" },
  { id: "zkw1050lwr-1105-lwr-ict", name: "ZKW1050LWR/1105 LWR ICT" },
  { id: "zkw1261", name: "ZKW1261" },
  { id: "zkw1251-1213", name: "ZKW1251&1213" },
  { id: "zkw1108", name: "ZKW1108" },
  { id: "pem6-epe", name: "PEM6 EPE" },
  { id: "pem6-ict", name: "PEM6 ICT" },
  { id: "pumu-ict", name: "PUMU ICT" },
  { id: "pumu-prog", name: "PUMU PROG" },
  { id: "pumu-1", name: "PUMU 1" },
  { id: "pumu-2", name: "PUMU 2" },
  { id: "hsu-osu-1", name: "HSU-OSU 1" },
  { id: "hsu-osu-2", name: "HSU-OSU 2" },
  { id: "hsu-osu-run-in", name: "HSU-OSU run in" },
  { id: "hsu-cu-epe", name: "HSU-CU EPE" },
  { id: "hsu-cu-ict", name: "HSU-CU ICT" },
  { id: "hsu-cu-prog", name: "HSU-CU PROG" },
  { id: "hsu-cu-run-in", name: "HSU-CU run in" },
  { id: "mraii-ict", name: "MRAII ICT" },
  { id: "mraii-1", name: "MRAII-1" },
  { id: "mraii-2", name: "MRAII-2" },
  { id: "vw-neo", name: "VW Neo" },
  { id: "shwp1223-epe", name: "SHWP1223 EPE" },
  { id: "shwp1223-ict", name: "SHWP1223 ICT" },
  { id: "cpm-ad1-0-epe", name: "CPM_AD1.0 EPE" },
  { id: "cpm-ad1-0-ict", name: "CPM_AD1.0 ICT" },
  { id: "cpm-ad1g5-epe", name: "CPM_AD1G5 EPE" },
  { id: "cpm-ad1g5-ict", name: "CPM_AD1G5 ICT" },
  { id: "adm-du-g2-ict", name: "ADM_DU_G2 ICT" },
  { id: "adm-du-g2-epe", name: "ADM_DU_G2 EPE" },
  { id: "adm-du-g2-prog", name: "ADM_DU_G2 PROG" },
  { id: "adm-aau-epe", name: "ADM_AAU EPE" },
  { id: "adm-aau-ict", name: "ADM_AAU ICT" },
  { id: "316", name: "316" },
  { id: "aero-b-epe", name: "Aero B EPE" },
  { id: "aero-b-ict", name: "Aero B ICT" },
  { id: "g4x-ict", name: "G4X ICT" },
  { id: "g4x-epe", name: "G4X EPE" },
  { id: "alfmeier-vw491", name: "Alfmeier VW491" },
  { id: "schaeffler-476-1", name: "Schaeffler 476-1" },
  { id: "schaeffler-476-2", name: "Schaeffler 476-2" },
  { id: "schaeffler-476-ict", name: "Schaeffler 476 ICT" },
  { id: "lotus-reae-seat-epe", name: "Lotus/Reae seat EPE" },
  { id: "lotus-ict", name: "Lotus ICT" },
  { id: "reae-seat-ict", name: "Reae seat ICT" },
  { id: "pem52-ict", name: "PEM52 ICT" },
  { id: "gem-6-ict", name: "Gem.6 ICT" },
  { id: "gen-6-plasma-workcell", name: "Gen.6 Plasma Workcell" },
  { id: "gen-6-set-workcell", name: "Gen.6 SET Workcell" },
  { id: "gen-6-run-in", name: "Gen.6-run in" },
  { id: "zkw1176-epe", name: "ZKW1176EPE" },
  { id: "zkw1176-ict", name: "ZKW1176 ICT" },
  { id: "gen-5-epe", name: "Gen.5EPE" },
  { id: "gen-5-ict", name: "Gen.5 ICT" },
  { id: "eop-1-ict", name: "EOP-1 ICT" },
  { id: "eop-1", name: "EOP-1" },
  { id: "eop-2-ict", name: "EOP-2 ICT" },
  { id: "eop-2", name: "EOP-2" },
  { id: "eop-run-in", name: "eop-run in" },
  { id: "wet-eop-ict", name: "Wet-EOP ICT" },
  { id: "wet-eop", name: "Wet-EOP" },
  { id: "wet-eop-run-in", name: "Wet-EOP run in" },
];
