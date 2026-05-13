import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Layout from "../components/Layout";
import styles from "./AnalyticsPro.module.css";

// Pure-SVG charts. Lightweight, no extra deps.
// All accept `width` + `height` and a `data` array.

// ─────────────────────────────────────────────────────────────────
// Chart primitives
// ─────────────────────────────────────────────────────────────────

const PALETTE = {
  primary: "#205d70",
  primaryLight: "#a3cfd9",
  success: "#1f7a5c",
  warning: "#d99124",
  danger: "#b84538",
  info: "#3a6ea5",
  muted: "#9aa3af",
};

const STATUS_COLORS = {
  pending: PALETTE.warning,
  confirmed: PALETTE.info,
  in_progress: PALETTE.primary,
  completed: PALETTE.success,
  cancelled: PALETTE.danger,
  approved: PALETTE.success,
  rejected: PALETTE.danger,
};

function formatINR(n) {
  const num = Number(n || 0);
  if (Math.abs(num) >= 10000000)
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

function formatNum(n) {
  return new Intl.NumberFormat("en-IN").format(Number(n || 0));
}

function LineChart({ data, height = 220, valueKey = "revenue" }) {
  const w = 600;
  const h = height;
  const padX = 36;
  const padY = 24;

  if (!data || data.length === 0) {
    return <div className={styles.empty}>No data for the selected range.</div>;
  }

  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  const stepX = (w - 2 * padX) / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = h - padY - ((d[valueKey] || 0) / max) * (h - 2 * padY);
    return { x, y, raw: d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${path} L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (max / yTicks) * i;
    const y = h - padY - (i / yTicks) * (h - 2 * padY);
    return { v, y };
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padX}
            x2={w - padX / 2}
            y1={t.y}
            y2={t.y}
            stroke="#eef0f3"
          />
          <text x={4} y={t.y + 3} fontSize="9" fill="#9aa3af">
            {formatINR(t.v)}
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(32, 93, 112, 0.08)" />
      <path
        d={path}
        fill="none"
        stroke={PALETTE.primary}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill={PALETTE.primary}
        >
          <title>
            {p.raw.date}: {formatINR(p.raw[valueKey])}
          </title>
        </circle>
      ))}
    </svg>
  );
}

function BarChart({ data, height = 220 }) {
  const w = 400;
  const h = height;
  const padX = 28;
  const padY = 28;

  if (!data || data.length === 0) {
    return <div className={styles.empty}>No bookings in this range.</div>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const slotW = (w - 2 * padX) / data.length;
  const barW = slotW * 0.6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      <line
        x1={padX}
        x2={w - padX}
        y1={h - padY}
        y2={h - padY}
        stroke="#e6e8ec"
      />
      {data.map((d, i) => {
        const x = padX + i * slotW + (slotW - barW) / 2;
        const barH = (d.count / max) * (h - 2 * padY);
        const y = h - padY - barH;
        const color = STATUS_COLORS[d.status] || PALETTE.primary;
        return (
          <g key={d.status}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill={color}
              opacity="0.85"
            >
              <title>
                {d.status}: {d.count}
              </title>
            </rect>
            <text
              x={x + barW / 2}
              y={y - 4}
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
              fill="#1a2332"
            >
              {d.count}
            </text>
            <text
              x={padX + i * slotW + slotW / 2}
              y={h - padY + 14}
              fontSize="9"
              textAnchor="middle"
              fill="#6b7280"
            >
              {String(d.status).replace("_", " ")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (n) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function AnalyticsPro() {
  const navigate = useNavigate();

  const [meta, setMeta] = useState({
    franchises: [],
    garages: [],
  });

  const [filters, setFilters] = useState({
    fromDate: daysAgoIso(30),
    toDate: todayIso(),
    franchiseId: "",
    garageId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMeta = useCallback(async () => {
    try {
      const res = await api.get("/analytics/meta");
      setMeta(res.data?.data || {});
    } catch {
      // Filter dropdowns gracefully degrade if meta fails.
    }
  }, []);

  const loadAnalytics = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      // Strip empty params so the server's defaults kick in.
      const clean = Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v),
      );
      const res = await api.get("/analytics", { params: clean });
      setData(res.data?.data || null);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load analytics data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadAnalytics(appliedFilters);
  }, [appliedFilters, loadAnalytics]);

  const garageOptions = useMemo(() => {
    if (!filters.franchiseId) return meta.garages;
    return (meta.garages || []).filter(
      (g) => String(g.franchiseId || "") === String(filters.franchiseId),
    );
  }, [filters.franchiseId, meta.garages]);

  const setFilter = (k, v) =>
    setFilters((current) => ({ ...current, [k]: v }));

  const handleApply = (e) => {
    e?.preventDefault?.();
    setAppliedFilters({ ...filters });
  };

  return (
    <Layout title="Analytics">
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Platform Analytics</h1>
          <p className={styles.headerSubtitle}>
            Cross-tenant revenue, bookings and garage performance.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => navigate("/")}
          >
            Garages
          </button>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => navigate("/franchises")}
          >
            Franchises
          </button>
        </div>
      </header>

      <form className={styles.filterBar} onSubmit={handleApply}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>From</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.fromDate}
            onChange={(e) => setFilter("fromDate", e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>To</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.toDate}
            onChange={(e) => setFilter("toDate", e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Franchise</label>
          <select
            className={styles.filterInput}
            value={filters.franchiseId}
            onChange={(e) => {
              setFilter("franchiseId", e.target.value);
              setFilter("garageId", "");
            }}
          >
            <option value="">All franchises</option>
            {(meta.franchises || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Garage</label>
          <select
            className={styles.filterInput}
            value={filters.garageId}
            onChange={(e) => setFilter("garageId", e.target.value)}
          >
            <option value="">All garages</option>
            {garageOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={styles.filterApply} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </button>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      <KpiSection kpis={data?.kpis} loading={loading} />

      <div className={styles.chartsRow}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Revenue trend</h3>
          <p className={styles.cardSubtitle}>
            Daily total revenue (₹) and amount collected.
          </p>
          <LineChart data={data?.revenueTrend || []} valueKey="revenue" />
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: PALETTE.primary }}
              />
              Total revenue
            </div>
          </div>
        </div>

      </div>

      <div className={styles.chartsRowSmall}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Bookings by status</h3>
          <p className={styles.cardSubtitle}>
            Counts in the selected date range.
          </p>
          <BarChart data={data?.bookingsByStatus || []} />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Garages by approval status</h3>
          <p className={styles.cardSubtitle}>
            Across all garages matching your filters.
          </p>
          <BarChart data={data?.garageStatusBreakdown || []} />
        </div>
      </div>

      <div className={styles.tablesRow}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top franchises</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Franchise</th>
                <th>Garages</th>
                <th className={styles.amount}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topFranchises || []).map((f) => (
                <tr key={f.franchiseId}>
                  <td data-label="Franchise">{f.name}</td>
                  <td data-label="Garages">{f.garageCount}</td>
                  <td data-label="Revenue" className={styles.amount}>{formatINR(f.revenue)}</td>
                </tr>
              ))}
              {(!data?.topFranchises || data.topFranchises.length === 0) && (
                <tr>
                  <td colSpan="3" className={styles.empty}>
                    No franchise data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top garages</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Garage</th>
                <th>Invoices</th>
                <th className={styles.amount}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topGarages || []).map((g) => (
                <tr key={g.garageId}>
                  <td data-label="Garage">
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    {g.franchise && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {g.franchise.name}
                      </div>
                    )}
                  </td>
                  <td data-label="Invoices">{formatNum(g.invoices)}</td>
                  <td data-label="Revenue" className={styles.amount}>{formatINR(g.revenue)}</td>
                </tr>
              ))}
              {(!data?.topGarages || data.topGarages.length === 0) && (
                <tr>
                  <td colSpan="3" className={styles.empty}>
                    No garages with revenue in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </Layout>
  );
}

function KpiSection({ kpis, loading }) {
  const cards = [
    {
      label: "Garages",
      value: kpis?.garageCount,
      hint: "All matching tenants",
      accent: PALETTE.primary,
      formatter: formatNum,
    },
    {
      label: "Franchises",
      value: kpis?.franchiseCount,
      hint: "Registered networks",
      accent: PALETTE.info,
      formatter: formatNum,
    },
    {
      label: "Bookings",
      value: kpis?.bookings,
      hint: "In selected range",
      accent: PALETTE.warning,
      formatter: formatNum,
    },
    {
      label: "Revenue",
      value: kpis?.revenue,
      hint: "Invoiced in range",
      accent: PALETTE.primary,
      formatter: formatINR,
    },
    {
      label: "Collected",
      value: kpis?.collected,
      hint: "Cash in",
      accent: PALETTE.success,
      formatter: formatINR,
    },
    {
      label: "Outstanding",
      value: kpis?.outstanding,
      hint: "Awaiting collection",
      accent: PALETTE.danger,
      formatter: formatINR,
    },
    {
      label: "Invoices",
      value: kpis?.invoices,
      hint: "Issued in range",
      accent: PALETTE.muted,
      formatter: formatNum,
    },
  ];

  return (
    <div className={styles.kpiGrid}>
      {cards.map((c) => (
        <article
          key={c.label}
          className={styles.kpiCard}
          style={{ "--accent": c.accent }}
        >
          <span className={styles.kpiLabel}>{c.label}</span>
          <span className={styles.kpiValue}>
            {loading && c.value == null
              ? "—"
              : c.formatter(c.value || 0)}
          </span>
          <span className={styles.kpiHint}>{c.hint}</span>
        </article>
      ))}
    </div>
  );
}
