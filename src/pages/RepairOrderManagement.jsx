import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import RepairOrderFormModal from "../components/RepairOrderFormModal";
import { useActiveGarage } from "../context/ActiveGarageContext";
import { printInvoice } from "../utils/invoicePrint";
import styles from "./RepairOrderManagement.module.css";

const STATUS_META = {
  created: { label: "Created", color: "#205d70" },
  in_progress: { label: "In progress", color: "#d99124" },
  vehicle_ready: { label: "Vehicle ready", color: "#1f7a5c" },
  completed: { label: "Completed", color: "#1f7a5c" },
  cancelled: { label: "Cancelled", color: "#b84538" },
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

export default function RepairOrderManagement() {
  const { activeGarageId, activeGarageName } = useActiveGarage();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [invoiceActionId, setInvoiceActionId] = useState(null);

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
      if (activeTab !== "all") params.status = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get("/repair-orders", { params });
      setOrders(res.data?.data?.orders || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load repair orders.");
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
      if (ctx.mode === "edit" && editOrder) {
        await api.put(`/repair-orders/${editOrder._id}`, payload, {
          params: { garageId: activeGarageId },
        });
      } else {
        await api.post("/repair-orders", payload, {
          params: { garageId: activeGarageId },
        });
      }
      setShowForm(false);
      setEditOrder(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = async (order) => {
    setFormLoading(true);
    try {
      const res = await api.get(`/repair-orders/${order._id}`, {
        params: { garageId: activeGarageId },
      });
      const full = res.data?.data?.order;
      setEditOrder(full || order);
      setShowForm(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load repair order.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    try {
      await api.delete(`/repair-orders/${deleteTarget._id}`, {
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

  const handleCreateAndDownloadInvoice = async (order) => {
    if (!activeGarageId || !order?._id) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download the invoice.");
      return;
    }

    setInvoiceActionId(order._id);
    try {
      const existingRes = await api.get("/invoices", {
        params: {
          garageId: activeGarageId,
          repairOrderId: order._id,
          limit: 1,
        },
      });
      let invoice = existingRes.data?.data?.invoices?.[0];

      if (!invoice) {
        const createRes = await api.post(
          "/invoices",
          { repairOrderId: order._id },
          { params: { garageId: activeGarageId } },
        );
        invoice = createRes.data?.data?.invoice;
      }

      if (!invoice?._id) {
        throw new Error("Invoice could not be created.");
      }

      const detailRes = await api.get(`/invoices/${invoice._id}`, {
        params: { garageId: activeGarageId },
      });
      const fullInvoice = detailRes.data?.data?.invoice || invoice;
      printInvoice(
        fullInvoice,
        { garageName: activeGarageName || "Selected garage" },
        printWindow,
      );
      await fetchAll();
    } catch (err) {
      printWindow.close();
      alert(err.response?.data?.message || err.message || "Could not create/download invoice.");
    } finally {
      setInvoiceActionId(null);
    }
  };

  const tabs = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "created", label: "Created" },
      { key: "in_progress", label: "In progress" },
      { key: "vehicle_ready", label: "Vehicle ready" },
      { key: "completed", label: "Completed" },
      { key: "cancelled", label: "Cancelled" },
    ],
    [],
  );

  const totalPages = Math.max(Math.ceil(total / PAGE_LIMIT), 1);

  if (!activeGarageId) {
    return (
      <Layout title="Repair Orders">
        <div className={styles.gateState}>
          <div className={styles.gateTitle}>Pick a garage first</div>
          <p>Use the garage selector in the top-right to choose which garage's repair orders you want to manage.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Repair Orders">
      <div className={styles.contextBar}>
        <span className={styles.contextLabel}>Acting as</span>
        <span className={styles.contextValue}>{activeGarageName || "Selected garage"}</span>
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
            placeholder="Search by order no, customer, reg no"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={styles.addBtn}
            onClick={() => {
              setEditOrder(null);
              setShowForm(true);
            }}
          >
            + New Repair Order
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading repair orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No repair orders found</div>
          <p>Try a different filter or create a new order for this garage.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const meta = STATUS_META[o.status] || STATUS_META.created;
                  return (
                    <tr key={o._id}>
                      <td>
                        <button className={styles.infoLink} onClick={() => openEdit(o)}>
                          {o.orderNo || String(o._id).slice(-6)}
                        </button>
                      </td>
                      <td>
                        {o.customerId?.fullName || "-"}
                        <br />
                        <small style={{ color: "#7a9aaa" }}>{o.customerId?.phoneNo || ""}</small>
                      </td>
                      <td>
                        {o.vehicleId
                          ? `${o.vehicleId.vehicleBrand || ""} ${o.vehicleId.vehicleModel || ""}`.trim() || "-"
                          : "-"}
                        <br />
                        <small style={{ color: "#7a9aaa" }}>
                          {o.vehicleId?.vehicleRegisterNo || ""}
                        </small>
                      </td>
                      <td>{o.scheduledAt ? fmtDate(o.scheduledAt) : "Walk-in"}</td>
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
                      <td>{money(o.totalAmount)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actBtn}
                            onClick={() => handleCreateAndDownloadInvoice(o)}
                            disabled={invoiceActionId === o._id}
                          >
                            {invoiceActionId === o._id ? "Preparing..." : "Invoice PDF"}
                          </button>
                          <button className={styles.actBtn} onClick={() => openEdit(o)}>
                            Edit
                          </button>
                          <button
                            className={styles.actBtn}
                            style={{ color: "#b84538" }}
                            onClick={() => setDeleteTarget(o)}
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
                Page {page} of {totalPages} · {fmt(total)} total
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
        <RepairOrderFormModal
          order={editOrder}
          activeGarageId={activeGarageId}
          loading={formLoading}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditOrder(null);
          }}
        />
      )}

      {deleteTarget && (
        <div
          className={styles.overlay}
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className={styles.confirmBox}>
            <h3>Delete order {deleteTarget.orderNo || ""}?</h3>
            <p
              style={{
                color: "#7a9aaa",
                margin: "8px 0 20px",
                fontSize: "13px",
              }}
            >
              This will soft-delete the repair order.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button className={styles.actBtn} onClick={() => setDeleteTarget(null)}>
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
