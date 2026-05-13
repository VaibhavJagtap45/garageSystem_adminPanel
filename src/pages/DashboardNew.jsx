import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Layout from "../components/Layout";
import styles from "./DashboardNew.module.css";

const STATUS_COLORS = {
  pending: "#d99124",
  confirmed: "#205d70",
  in_progress: "#2a7a8a",
  completed: "#1f7a5c",
  cancelled: "#b84538",
};

function fmt(v) {
  return new Intl.NumberFormat("en-IN").format(v || 0);
}

function fmtCurrency(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function QuickIcon({ d }) {
  return (
    <svg className={styles.quickIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

export default function DashboardNew() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [garageStats, setGarageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, garageRes] = await Promise.all([
        api.get("/analytics"),
        api.get("/garages/stats"),
      ]);
      setData(analyticsRes.data?.data || null);
      setGarageStats(garageRes.data?.data || null);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <Layout title="Dashboard">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading dashboard...</span>
        </div>
      </Layout>
    );
  }

  const kpis = data?.kpis || {};
  const revTrend = data?.revenueTrend || [];
  const bookings = data?.bookingsByStatus || [];
  const topGarages = data?.topGarages || [];
  const topFranchises = data?.topFranchises || [];
  const maxBooking = Math.max(...bookings.map((b) => b.count), 1);
  const maxRev = Math.max(...revTrend.map((r) => r.revenue), 1);

  return (
    <Layout title="Dashboard">
      {/* Quick Actions */}
      <div className={styles.quickRow}>
        <button className={`${styles.quickBtn} ${styles.quickBtnPrimary}`} onClick={() => navigate("/garages")}>
          <QuickIcon d={["M12 5v14", "M5 12h14"]} />
          <span>Add Garage</span>
        </button>
        <button className={`${styles.quickBtn} ${styles.quickBtnSecondary}`} onClick={() => navigate("/franchises")}>
          <QuickIcon d={["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5"]} />
          <span>Franchises</span>
        </button>
        <button className={`${styles.quickBtn} ${styles.quickBtnSecondary}`} onClick={() => navigate("/tally-export")}>
          <QuickIcon d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6"]} />
          <span>Tally Export</span>
        </button>
        <button className={`${styles.quickBtn} ${styles.quickBtnSecondary}`} onClick={() => navigate("/analytics")}>
          <QuickIcon d={["M18 20V10", "M12 20V4", "M6 20v-6"]} />
          <span>Analytics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <KpiCard label="Total Garages" value={fmt(garageStats?.total || kpis.garageCount)} note="All registered garages" accent="#205d70" />
        <KpiCard label="Revenue" value={fmtCurrency(kpis.revenue)} note={`Collected: ${fmtCurrency(kpis.collected)}`} accent="#1f7a5c" />
        <KpiCard label="Bookings" value={fmt(kpis.bookings)} note="In selected period" accent="#d55a34" />
        <KpiCard label="Invoices" value={fmt(kpis.invoices)} note={`Outstanding: ${fmtCurrency(kpis.outstanding)}`} accent="#6b3fa0" />
        <KpiCard label="Franchises" value={fmt(kpis.franchiseCount)} note="Total franchise groups" accent="#2a7a8a" />
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Revenue Trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Revenue Trend</div>
          <div className={styles.chartSub}>Daily revenue over selected period</div>
          <div className={styles.chartCanvas}>
            <div className={styles.barGroup}>
              {revTrend.length === 0 && (
                <div className={styles.emptyRank}>No revenue data for this period</div>
              )}
              {revTrend.map((r, i) => (
                <div
                  key={i}
                  className={`${styles.bar} ${styles.barPrimary}`}
                  style={{ height: `${Math.max((r.revenue / maxRev) * 100, 4)}%` }}
                  data-label={`${r.date}: ${fmtCurrency(r.revenue)}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bookings by Status */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Bookings by Status</div>
          <div className={styles.chartSub}>Breakdown of booking statuses</div>
          <div className={styles.statusBars}>
            {bookings.map((b) => (
              <div key={b.status} className={styles.statusRow}>
                <span className={styles.statusLabel}>{b.status.replace("_", " ")}</span>
                <div className={styles.statusTrack}>
                  <div
                    className={styles.statusFill}
                    style={{
                      width: `${Math.max((b.count / maxBooking) * 100, 3)}%`,
                      background: STATUS_COLORS[b.status] || "#7a9aaa",
                    }}
                  >
                    {b.count > 0 ? b.count : ""}
                  </div>
                </div>
                <span className={styles.statusCount}>{fmt(b.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Rankings */}
      <div className={styles.rankingsRow}>
        <div className={styles.rankCard}>
          <div className={styles.chartTitle}>Top Garages</div>
          <div className={styles.chartSub}>By revenue</div>
          {topGarages.length === 0 ? (
            <div className={styles.emptyRank}>No data yet</div>
          ) : (
            <div className={styles.rankList}>
              {topGarages.map((g, i) => (
                <div key={g.garageId} className={styles.rankItem}>
                  <div className={styles.rankBadge}>{i + 1}</div>
                  <div className={styles.rankInfo}>
                    <div className={styles.rankName}>{g.name}</div>
                    <div className={styles.rankMeta}>{g.franchise?.name || "Independent"} &middot; {fmt(g.invoices)} invoices</div>
                  </div>
                  <div className={styles.rankValue}>{fmtCurrency(g.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.rankCard}>
          <div className={styles.chartTitle}>Top Franchises</div>
          <div className={styles.chartSub}>By revenue</div>
          {topFranchises.length === 0 ? (
            <div className={styles.emptyRank}>No data yet</div>
          ) : (
            <div className={styles.rankList}>
              {topFranchises.map((f, i) => (
                <div key={f.franchiseId} className={styles.rankItem}>
                  <div className={styles.rankBadge} style={{ background: "#d55a34" }}>{i + 1}</div>
                  <div className={styles.rankInfo}>
                    <div className={styles.rankName}>{f.name}</div>
                    <div className={styles.rankMeta}>{f.code} &middot; {fmt(f.garageCount)} garages</div>
                  </div>
                  <div className={styles.rankValue}>{fmtCurrency(f.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Garage Stats Summary */}
      {garageStats && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Garage Approvals</div>
            <div className={styles.chartSub}>Current approval status breakdown</div>
            <div className={styles.statusBars}>
              {[
                { label: "Pending", count: garageStats.pending, color: "#d99124" },
                { label: "Approved", count: garageStats.approved, color: "#1f7a5c" },
                { label: "Rejected", count: garageStats.rejected, color: "#b84538" },
              ].map((s) => (
                <div key={s.label} className={styles.statusRow}>
                  <span className={styles.statusLabel}>{s.label}</span>
                  <div className={styles.statusTrack}>
                    <div
                      className={styles.statusFill}
                      style={{
                        width: `${Math.max((s.count / (garageStats.total || 1)) * 100, 3)}%`,
                        background: s.color,
                      }}
                    >
                      {s.count > 0 ? s.count : ""}
                    </div>
                  </div>
                  <span className={styles.statusCount}>{fmt(s.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function KpiCard({ label, value, note, accent }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiAccent} style={{ background: accent }} />
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiNote}>{note}</div>
    </div>
  );
}
