import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import InvoiceFormModal from "../components/InvoiceFormModal";
import { useActiveGarage } from "../context/ActiveGarageContext";
import { printInvoice } from "../utils/invoicePrint";
import styles from "./InvoiceManagement.module.css";

const PAYMENT_STATUS_META = {
  paid: { label: "Paid", color: "#1f7a5c" },
  partial: { label: "Partial", color: "#d99124" },
  unpaid: { label: "Unpaid", color: "#b84538" },
};

function fmt(v) {
  return new Intl.NumberFormat("en-IN").format(v || 0);
}

function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

function fmtDate(v) {
  if (!v) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
}

const PAGE_LIMIT = 20;

export default function InvoiceManagement() {
  const { activeGarageId, activeGarageName } = useActiveGarage();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, paid: 0, credit: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadTargetId, setDownloadTargetId] = useState(null);

  // Debounce search input.
  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [search]);

  const fetchAll = useCallback(async () => {
    if (!activeGarageId) return;
    setLoading(true);
    try {
      const params = {
        garageId: activeGarageId,
        page,
        limit: PAGE_LIMIT,
      };
      if (activeTab !== "all") params.paymentStatus = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;

      const [listRes, statsRes] = await Promise.all([
        api.get("/invoices", { params }),
        api.get("/invoices/stats", { params: { garageId: activeGarageId } }),
      ]);
      setInvoices(listRes.data?.data?.invoices || []);
      setTotal(listRes.data?.data?.total || 0);
      setStats(statsRes.data?.data || { total: 0, paid: 0, credit: 0 });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, [activeGarageId, activeTab, debouncedSearch, page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (payload, ctx = {}) => {
    if (!activeGarageId) return;
    setFormLoading(true);
    try {
      if (ctx.mode === "edit" && editInvoice) {
        await api.put(`/invoices/${editInvoice._id}`, payload, {
          params: { garageId: activeGarageId },
        });
      } else {
        await api.post("/invoices", payload, {
          params: { garageId: activeGarageId },
        });
      }
      setShowForm(false);
      setEditInvoice(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = async (inv) => {
    setFormLoading(true);
    try {
      const res = await api.get(`/invoices/${inv._id}`, {
        params: { garageId: activeGarageId },
      });
      const full = res.data?.data?.invoice;
      setEditInvoice(full || inv);
      setShowForm(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load invoice.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    try {
      await api.delete(`/invoices/${deleteTarget._id}`, {
        params: { garageId: activeGarageId },
      });
      setDeleteTarget(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownload = async (inv) => {
    if (!activeGarageId || !inv?._id) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download the invoice.");
      return;
    }

    setDownloadTargetId(inv._id);
    try {
      const res = await api.get(`/invoices/${inv._id}`, {
        params: { garageId: activeGarageId },
      });
      const fullInvoice = res.data?.data?.invoice || inv;
      printInvoice(
        fullInvoice,
        { garageName: activeGarageName || "Selected garage" },
        printWindow,
      );
    } catch (err) {
      printWindow.close();
      alert(err.response?.data?.message || "Could not download invoice.");
    } finally {
      setDownloadTargetId(null);
    }
  };

  const tabs = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "paid", label: "Paid" },
      { key: "partial", label: "Partial" },
      { key: "unpaid", label: "Unpaid" },
    ],
    [],
  );

  const totalPages = Math.max(Math.ceil(total / PAGE_LIMIT), 1);

  if (!activeGarageId) {
    return (
      <Layout title="Invoices">
        <div className={styles.gateState}>
          <div className={styles.gateTitle}>Pick a garage first</div>
          <p>Use the garage selector in the top-right to choose which garage's invoices you want to manage.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Invoices">
      <div className={styles.contextBar}>
        <span className={styles.contextLabel}>Acting as</span>
        <span className={styles.contextValue}>{activeGarageName || "Selected garage"}</span>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total billed</div>
          <div className={styles.statValue}>{money(stats.total)}</div>
        </div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #1f7a5c" }}>
          <div className={styles.statLabel}>Paid</div>
          <div className={styles.statValue}>{money(stats.paid)}</div>
        </div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #b84538" }}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={styles.statValue}>{money(stats.credit)}</div>
        </div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #205d70" }}>
          <div className={styles.statLabel}>Count</div>
          <div className={styles.statValue}>{fmt(total)}</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabsBar}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarActions}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search invoice no, customer name, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={styles.addBtn}
            onClick={() => {
              setEditInvoice(null);
              setShowForm(true);
            }}
          >
            + New Invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading invoices...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No invoices found</div>
          <p>Try a different filter or create a new invoice for this garage.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const meta =
                    PAYMENT_STATUS_META[inv.paymentStatus] ||
                    PAYMENT_STATUS_META.unpaid;
                  return (
                    <tr key={inv._id}>
                      <td>
                        <button
                          className={styles.infoLink}
                          onClick={() => openEdit(inv)}
                        >
                          {inv.invoiceNo || String(inv._id).slice(-6)}
                        </button>
                      </td>
                      <td>
                        {inv.customerId?.fullName || "-"}
                        <br />
                        <small style={{ color: "#7a9aaa" }}>
                          {inv.customerId?.phoneNo || ""}
                        </small>
                      </td>
                      <td>
                        {inv.vehicleId
                          ? `${inv.vehicleId.vehicleBrand || ""} ${inv.vehicleId.vehicleModel || ""}`.trim() || "-"
                          : "-"}
                        <br />
                        <small style={{ color: "#7a9aaa" }}>
                          {inv.vehicleId?.vehicleRegisterNo || ""}
                        </small>
                      </td>
                      <td>{fmtDate(inv.createdAt)}</td>
                      <td>{money(inv.totalAmount)}</td>
                      <td>{money(inv.paidAmount)}</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: `${meta.color}18`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actBtn}
                            onClick={() => handleDownload(inv)}
                            disabled={downloadTargetId === inv._id}
                          >
                            {downloadTargetId === inv._id ? "Preparing..." : "Download"}
                          </button>
                          <button
                            className={styles.actBtn}
                            onClick={() => openEdit(inv)}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.actBtn}
                            style={{ color: "#b84538" }}
                            onClick={() => setDeleteTarget(inv)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <InvoiceFormModal
          invoice={editInvoice}
          activeGarageId={activeGarageId}
          loading={formLoading}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditInvoice(null);
          }}
        />
      )}

      {deleteTarget && (
        <div
          className={styles.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && setDeleteTarget(null)
          }
        >
          <div className={styles.confirmBox}>
            <h3>Delete invoice {deleteTarget.invoiceNo || ""}?</h3>
            <p
              style={{
                color: "#7a9aaa",
                margin: "8px 0 20px",
                fontSize: "13px",
              }}
            >
              This will soft-delete the invoice. Inventory will be returned to stock.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className={styles.actBtn}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={formLoading}
              >
                {formLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
