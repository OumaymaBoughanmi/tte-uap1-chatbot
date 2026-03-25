export interface ChartItem {
  label: string;
  value: number;
  extra?: string;
}

export interface DashboardData {
  // ─── UAP1 KPIs ─────────────────────────────────────────────────────────
  totalBundles: number;
  validatedBundles: number;
  notValidatedBundles: number;
  bundlesInPagoda: number;
  bundlesLeftPagoda: number;
  totalOrders: number;
  totalHistoryRecords: number;

  // ─── CAO KPIs ──────────────────────────────────────────────────────────
  totalTools: number;
  lockedTools: number;
  totalMachines: number;
  excludedMachines: number;

  // ─── Timeline ──────────────────────────────────────────────────────────
  lastExitedLabelId: string;
  lastExitedDate: string;
  lastExitedPagodaPlace: string;
  firstBundleInsertTime: string;
  lastBundleUpdateTime: string;

  // ─── UAP1 Charts ───────────────────────────────────────────────────────
  bundlesPerLeadset: ChartItem[];
  quantityProducedPerStation: ChartItem[];
  lastExitPerPagoda: ChartItem[];

  // ─── CAO Charts ────────────────────────────────────────────────────────
  toolLockStatus: ChartItem[];
  machineStatus: ChartItem[];
  goodVsBadPartsPerTool: ChartItem[];
  toolsApproachingMaintenance: ChartItem[];
}
