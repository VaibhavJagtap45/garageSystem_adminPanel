import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import styles from "./TallyExport.module.css";

function today() {
  return new Date().toISOString().split("T")[0];
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function BtnIcon({ d }) {
  return (
    <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const STATUS_CLS = { paid: styles.statusPaid, unpaid: styles.statusUnpaid, partial: styles.statusPartial };

export default function TallyExport() {
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [franchiseId, setFranchiseId] = useState("");
  const [garageId, setGarageId] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [franchises, setFranchises] = useState([]);
  const [garages, setGarages] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/analytics/meta");
        const d = res.data?.data;
        setFranchises(d?.franchises || []);
        setGarages(d?.garages || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const filteredGarages = garages.filter(
    (g) => !franchiseId || String(g.franchiseId) === franchiseId,
  );

  const handlePreview = useCallback(async () => {
    if (!dateFrom || !dateTo) return alert("Please select date range.");
    setLoading(true);
    try {
      const params = { dateFrom, dateTo };
      if (franchiseId) params.franchiseId = franchiseId;
      if (garageId) params.garageId = garageId;
      const res = await api.get("/tally-export", { params });
      const d = res.data?.data;
      setRows(d?.rows || []);
      setTotal(d?.total || 0);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load export data.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, franchiseId, garageId]);

  const handleDownloadCSV = useCallback(async () => {
    if (!dateFrom || !dateTo) return alert("Please select date range.");
    setExporting(true);
    try {
      const params = { dateFrom, dateTo };
      if (franchiseId) params.franchiseId = franchiseId;
      if (garageId) params.garageId = garageId;
      const res = await api.get("/tally-export/csv", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `tally-export-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download CSV.");
    } finally {
      setExporting(false);
    }
  }, [dateFrom, dateTo, franchiseId, garageId]);

  const grandTotal = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const grandPaid = rows.reduce((s, r) => s + (r.paidAmount || 0), 0);
  const grandGst = rows.reduce((s, r) => s + (r.gst || 0), 0);

  return (
    <Layout title="Tally Export">
      {/* Filters */}
      <div className={styles.filterCard}>
        <div className={styles.filterTitle}>Export Filters</div>
        <div className={styles.filterSub}>Select date range and optional filters to generate Tally-compatible export data.</div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>From Date</label>
            <input type="date" className={styles.filterInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>To Date</label>
            <input type="date" className={styles.filterInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Franchise</label>
            <select className={styles.filterSelect} value={franchiseId} onChange={(e) => { setFranchiseId(e.target.value); setGarageId(""); }}>
              <option value="">All Franchises</option>
              {franchises.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Garage</label>
            <select className={styles.filterSelect} value={garageId} onChange={(e) => setGarageId(e.target.value)}>
              <option value="">All Garages</option>
              {filteredGarages.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button className={styles.previewBtn} onClick={handlePreview} disabled={loading}>
            <BtnIcon d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"]} />
            {loading ? "Loading..." : "Preview"}
          </button>
          <button className={styles.exportBtn} onClick={handleDownloadCSV} disabled={exporting || rows.length === 0}>
            <BtnIcon d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]} />
            {exporting ? "Exporting..." : "Download CSV"}
          </button>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /><span>Loading export data...</span></div>
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No export data</div>
          <p>Select a date range and click Preview to load data.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableTitle}>Export Preview</div>
              <div className={styles.tableCount}>{total} records &middot; Total: ₹{grandTotal.toLocaleString("en-IN")} &middot; GST: ₹{grandGst.toLocaleString("en-IN")} &middot; Collected: ₹{grandPaid.toLocaleString("en-IN")}</div>
            </div>
            <button className={styles.exportBtn} onClick={handleDownloadCSV} disabled={exporting}>
              <BtnIcon d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]} />
              {exporting ? "Exporting..." : "Download CSV"}
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Garage</th>
                  <th>Owner</th>
                  <th>Customer</th>
                  <th>Service Amt</th>
                  <th>Discount</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Date">{r.date}</td>
                    <td data-label="Invoice">{r.invoiceNo}</td>
                    <td data-label="Garage">{r.garageName}</td>
                    <td data-label="Owner">{r.ownerName}</td>
                    <td data-label="Customer">{r.customerName}</td>
                    <td data-label="Service Amt">₹{r.serviceAmount.toLocaleString("en-IN")}</td>
                    <td data-label="Discount">₹{r.discount.toLocaleString("en-IN")}</td>
                    <td data-label="GST">₹{r.gst.toLocaleString("en-IN")}</td>
                    <td data-label="Total">₹{r.totalAmount.toLocaleString("en-IN")}</td>
                    <td data-label="Paid">₹{r.paidAmount.toLocaleString("en-IN")}</td>
                    <td data-label="Status" className={STATUS_CLS[r.paymentStatus] || ""}>{r.paymentStatus}</td>
                    <td data-label="Mode">{r.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
