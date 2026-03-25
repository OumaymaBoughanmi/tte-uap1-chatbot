package com.chatbot.dashboard;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class DashboardService {

    @PersistenceContext
    private EntityManager entityManager;

    public DashboardDTO getDashboardData() {
        log.info("Loading dashboard data...");

        return DashboardDTO.builder()
                // ─── UAP1 KPI Cards ───────────────────────────────────────
                .totalBundles(countQuery("SELECT COUNT(*) FROM bundles"))
                .validatedBundles(countQuery("SELECT COUNT(*) FROM bundles WHERE Status = 1"))
                .notValidatedBundles(countQuery("SELECT COUNT(*) FROM bundles WHERE Status = 0"))
                .bundlesInPagoda(countQuery("SELECT COUNT(*) FROM bundles WHERE InvalidDtZt IS NULL"))
                .bundlesLeftPagoda(countQuery("SELECT COUNT(*) FROM bundles WHERE InvalidDtZt IS NOT NULL"))
                .totalOrders(countQuery("SELECT COUNT(*) FROM orders"))
                .totalHistoryRecords(countQuery("SELECT COUNT(*) FROM bundles_history"))

                // ─── CAO KPI Cards ────────────────────────────────────────
                .totalTools(countQuery("SELECT COUNT(*) FROM tool"))
                .lockedTools(countQuery("SELECT COUNT(*) FROM tool WHERE Locked = 1"))
                .totalMachines(countQuery("SELECT COUNT(*) FROM machines"))
                .excludedMachines(countQuery("SELECT COUNT(*) FROM machines WHERE Excluded = 1"))

                // ─── Timeline ─────────────────────────────────────────────
                .firstBundleInsertTime(scalarQuery(
                    "SELECT DATE_FORMAT(MIN(InsertTime), '%d/%m/%Y %H:%i') FROM bundles"
                ))
                .lastBundleUpdateTime(scalarQuery(
                    "SELECT DATE_FORMAT(MAX(UpdateTime), '%d/%m/%Y %H:%i') FROM bundles"
                ))

                // ─── UAP1 Charts ──────────────────────────────────────────
                .bundlesPerLeadset(chartQuery(
                    "SELECT Leadset, COUNT(*) FROM bundles GROUP BY Leadset ORDER BY COUNT(*) DESC"
                ))
                .quantityProducedPerStation(chartQuery(
                    "SELECT PagodaPlace, SUM(QuantityProduced) FROM bundles WHERE PagodaPlace IS NOT NULL GROUP BY PagodaPlace ORDER BY SUM(QuantityProduced) DESC"
                ))
                .lastExitPerPagoda(lastExitPerPagodaQuery())

                // ─── CAO Charts ───────────────────────────────────────────
                .toolLockStatus(chartQuery(
                    "SELECT CASE WHEN Locked = 1 THEN 'Locked' ELSE 'Unlocked' END AS status, COUNT(*) FROM tool GROUP BY Locked"
                ))
                .machineStatus(chartQuery(
                    "SELECT CASE WHEN Excluded = 1 THEN 'Excluded' ELSE 'Active' END AS status, COUNT(*) FROM machines GROUP BY Excluded"
                ))
                .goodVsBadPartsPerTool(goodVsBadPartsQuery())
                .toolsApproachingMaintenance(toolsApproachingMaintenanceQuery())

                .build();
    }

    // ─── Query Helpers ────────────────────────────────────────────────────────

    private long countQuery(String sql) {
        try {
            Object result = entityManager.createNativeQuery(sql).getSingleResult();
            return result != null ? ((Number) result).longValue() : 0L;
        } catch (Exception e) {
            log.error("Count query failed: {} — {}", sql, e.getMessage());
            return 0L;
        }
    }

    private String scalarQuery(String sql) {
        try {
            Object result = entityManager.createNativeQuery(sql).getSingleResult();
            return result != null ? result.toString() : "N/A";
        } catch (Exception e) {
            log.error("Scalar query failed: {} — {}", sql, e.getMessage());
            return "N/A";
        }
    }

    @SuppressWarnings("unchecked")
    private List<DashboardDTO.ChartItem> chartQuery(String sql) {
        try {
            List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
            List<DashboardDTO.ChartItem> items = new ArrayList<>();
            for (Object[] row : rows) {
                String label = row[0] != null ? row[0].toString() : "Unknown";
                Double value = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                items.add(DashboardDTO.ChartItem.builder()
                        .label(label)
                        .value(value)
                        .build());
            }
            return items;
        } catch (Exception e) {
            log.error("Chart query failed: {} — {}", sql, e.getMessage());
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<DashboardDTO.ChartItem> lastExitPerPagodaQuery() {
        try {
            String sql = """
                    SELECT
                        PagodaPlace,
                        COUNT(*) AS total_exited,
                        DATE_FORMAT(MAX(InvalidDtZt), '%d/%m/%Y %H:%i') AS last_exit
                    FROM bundles
                    WHERE InvalidDtZt IS NOT NULL
                    GROUP BY PagodaPlace
                    ORDER BY MAX(InvalidDtZt) DESC
                    """;
            List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
            List<DashboardDTO.ChartItem> items = new ArrayList<>();
            for (Object[] row : rows) {
                String label = row[0] != null ? row[0].toString() : "Unknown";
                Double value = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                String extra = row[2] != null ? row[2].toString() : "N/A";
                items.add(DashboardDTO.ChartItem.builder()
                        .label(label)
                        .value(value)
                        .extra(extra)
                        .build());
            }
            return items;
        } catch (Exception e) {
            log.error("Last exit query failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<DashboardDTO.ChartItem> goodVsBadPartsQuery() {
        try {
            String sql = """
                    SELECT InventoryNo, GoodPartCounter, BadPartCounter
                    FROM tool
                    WHERE BadPartCounter > 0
                    ORDER BY BadPartCounter DESC
                    LIMIT 10
                    """;
            List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
            List<DashboardDTO.ChartItem> items = new ArrayList<>();
            for (Object[] row : rows) {
                String label = row[0] != null ? row[0].toString() : "Unknown";
                Double bad = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
                String extra = row[1] != null ? row[1].toString() : "0";
                items.add(DashboardDTO.ChartItem.builder()
                        .label(label)
                        .value(bad)
                        .extra(extra)
                        .build());
            }
            return items;
        } catch (Exception e) {
            log.error("Good vs bad parts query failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<DashboardDTO.ChartItem> toolsApproachingMaintenanceQuery() {
        try {
            String sql = """
                    SELECT InventoryNo,
                           ROUND((Counter / NULLIF(MaxCounter, 0)) * 100, 1) AS usage_pct
                    FROM tool
                    WHERE MaxCounter > 0
                      AND Locked = 0
                      AND Counter >= (MaxCounter * 0.75)
                    ORDER BY usage_pct DESC
                    LIMIT 10
                    """;
            List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
            List<DashboardDTO.ChartItem> items = new ArrayList<>();
            for (Object[] row : rows) {
                String label = row[0] != null ? row[0].toString() : "Unknown";
                Double value = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                items.add(DashboardDTO.ChartItem.builder()
                        .label(label)
                        .value(value)
                        .build());
            }
            return items;
        } catch (Exception e) {
            log.error("Tools approaching maintenance query failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}
