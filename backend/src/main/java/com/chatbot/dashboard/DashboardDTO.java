package com.chatbot.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {

    // ─── UAP1 KPI Cards ──────────────────────────────────────────────────────
    private long totalBundles;
    private long validatedBundles;
    private long notValidatedBundles;
    private long bundlesInPagoda;
    private long bundlesLeftPagoda;
    private long totalOrders;
    private long totalHistoryRecords;

    // ─── CAO KPI Cards ───────────────────────────────────────────────────────
    private long totalTools;
    private long lockedTools;
    private long totalMachines;
    private long excludedMachines;

    // ─── Timeline ────────────────────────────────────────────────────────────
    private String firstBundleInsertTime;
    private String lastBundleUpdateTime;

    // ─── UAP1 Charts ─────────────────────────────────────────────────────────
    private List<ChartItem> bundlesPerLeadset;
    private List<ChartItem> quantityProducedPerStation;
    private List<ChartItem> lastExitPerPagoda;

    // ─── CAO Charts ──────────────────────────────────────────────────────────
    private List<ChartItem> toolLockStatus;
    private List<ChartItem> machineStatus;
    private List<ChartItem> goodVsBadPartsPerTool;
    private List<ChartItem> toolsApproachingMaintenance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartItem {
        private String label;
        private Double value;
        private String extra;
    }
}
