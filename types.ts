
export enum WasteCategory {
  PLAST = 'Žlutá: Plasty',
  PAPIR = 'Modrá: Papír',
  SKLO = 'Zelená/Bílá: Sklo',
  BIO = 'Hnědá: Bioodpad',
  SMESNY = 'Směsný odpad: Černá popelnice',
  SBERNY_DVUR = 'Sběrný dvůr: Nebezpečný nebo velkoobjemový odpad',
  KOVY = 'Šedá: Kovy',
  OLEJE = 'Sběrný kontejner na jedlé oleje',
  TEXTIL = 'Sběrný kontejner na textil',
  LEKARNA = 'Lékárna'
}

export interface WasteItem {
  id: string;
  name: string;
  category: WasteCategory;
  note?: string;
  isFromDatabase: boolean;
}

export interface ChatHistoryItem {
  query: string;
  result: WasteItem;
  timestamp: number;
}
