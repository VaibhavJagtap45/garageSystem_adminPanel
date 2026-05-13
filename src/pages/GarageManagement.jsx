import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import GarageFormModal from "../components/GarageFormModalPro";
import styles from "./GarageManagement.module.css";

const STATUS_META = {
  pending: { label: "Pending", color: "#d99124" },
  approved: { label: "Approved", color: "#1f7a5c" },
  rejected: { label: "Rejected", color: "#b84538" },
};

const GARAGE_TYPE_LABELS = {
  twoWheeler: "2-Wheeler",
  fourWheeler: "4-Wheeler",
  both: "Both",
};

function fmt(v) {
  return new Intl.NumberFormat("en-IN").format(v || 0);
}

function fmtDate(v) {
  if (!v) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
}

function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

function SmallIcon({ d, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

export default function GarageManagement() {
  const [garages, setGarages] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editGarage, setEditGarage] = useState(null);
  const [parentOwner, setParentOwner] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBikeCatalog, setShowBikeCatalog] = useState(false);
  const [vehicleMeta, setVehicleMeta] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    brand: "",
    models: "",
    modelBrand: "",
    model: "",
  });
  const [detailTarget, setDetailTarget] = useState(null);
  const [garageDetail, setGarageDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAll = useCallback(async (status) => {
    setLoading(true);
    try {
      const params = status === "all" ? {} : { status };
      const [gRes, sRes] = await Promise.all([
        api.get("/garages", { params }),
        api.get("/garages/stats"),
      ]);
      setGarages(gRes.data?.data?.garages || []);
      setStats(sRes.data?.data || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(activeTab);
  }, [activeTab, fetchAll]);

  const refresh = () => fetchAll(activeTab);

  const loadVehicleMeta = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get("/vehicle-meta", { params: { type: "2W" } });
      const items = res.data?.data?.items || [];
      setVehicleMeta(items);
      setCatalogForm((prev) => ({
        ...prev,
        modelBrand: prev.modelBrand || items[0]?.brand || "",
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load bike catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const openBikeCatalog = async () => {
    setShowBikeCatalog(true);
    await loadVehicleMeta();
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    const brand = catalogForm.brand.trim();
    const models = catalogForm.models.split(",").map((m) => m.trim()).filter(Boolean);
    if (!brand) return alert("Brand name is required.");

    setCatalogLoading(true);
    try {
      await api.post("/vehicle-meta/brand", { type: "2W", brand, models });
      setCatalogForm((prev) => ({ ...prev, brand: "", models: "", modelBrand: brand }));
      await loadVehicleMeta();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add brand.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    const brand = catalogForm.modelBrand.trim();
    const model = catalogForm.model.trim();
    if (!brand || !model) return alert("Brand and model are required.");

    setCatalogLoading(true);
    try {
      await api.post("/vehicle-meta/model", { type: "2W", brand, model });
      setCatalogForm((prev) => ({ ...prev, model: "" }));
      await loadVehicleMeta();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add model.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const openGarageDetail = async (garage) => {
    setDetailTarget(garage);
    setGarageDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/garages/${garage._id}`);
      setGarageDetail(res.data?.data || null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load garage info.");
      setDetailTarget(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/garages/${id}/approve`);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/garages/${id}/reject`);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async (payload, ctx = {}) => {
    setFormLoading(true);
    try {
      if (ctx.mode === "edit" && editGarage) {
        await api.put(`/garages/${editGarage._id}`, payload);
      } else {
        await api.post("/garages", payload);
      }
      setShowForm(false);
      setEditGarage(null);
      setParentOwner(null);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    try {
      await api.delete(`/garages/${deleteTarget._id}`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const tabs = [
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "all", label: "All", count: stats.total },
  ];

  return (
    <Layout title="Garage Management">
      <div className={styles.statsRow}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total</div><div className={styles.statValue}>{fmt(stats.total)}</div></div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #d99124" }}><div className={styles.statLabel}>Pending</div><div className={styles.statValue}>{fmt(stats.pending)}</div></div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #1f7a5c" }}><div className={styles.statLabel}>Approved</div><div className={styles.statValue}>{fmt(stats.approved)}</div></div>
        <div className={styles.statCard} style={{ borderLeft: "3px solid #b84538" }}><div className={styles.statLabel}>Rejected</div><div className={styles.statValue}>{fmt(stats.rejected)}</div></div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabsBar}>
          {tabs.map((t) => (
            <button key={t.key} className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label} <span className={styles.tabCount}>{fmt(t.count)}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.catalogBtn} onClick={openBikeCatalog}>
            Bike Brand / Model
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /><span>Loading...</span></div>
      ) : garages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No garages in this view</div>
          <p>Add a garage or switch tabs.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Garage</th>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {garages.map((g) => {
                  const owner = g.owner || {};
                  const status = STATUS_META[g.approvalStatus] || STATUS_META.pending;
                  return (
                    <tr key={g._id}>
                      <td>
                        <div className={styles.garageCell}>
                          <button className={styles.infoLink} onClick={() => openGarageDetail(g)}>
                            {g.garageName || "Unnamed"}
                          </button>
                          {g.isPrimaryBranch && <span className={styles.primaryPill}>Primary</span>}
                        </div>
                      </td>
                      <td>{owner.fullName || g.garageOwnerName || "-"}<br /><small style={{ color: "#7a9aaa" }}>{owner.phoneNo || ""}</small></td>
                      <td>{GARAGE_TYPE_LABELS[g.garageType] || g.garageType}</td>
                      <td>{g.garageContactNumber || "-"}</td>
                      <td>{g.state || "-"}</td>
                      <td><span className={styles.badge} style={{ background: `${status.color}18`, color: status.color }}>{status.label}</span></td>
                      <td>{fmtDate(g.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          {g.approvalStatus === "pending" && (
                            <>
                              <button className={styles.actBtn} style={{ color: "#1f7a5c" }} onClick={() => handleApprove(g._id)} disabled={actionLoading === g._id}>Approve</button>
                              <button className={styles.actBtn} style={{ color: "#b84538" }} onClick={() => handleReject(g._id)} disabled={actionLoading === g._id}>Reject</button>
                            </>
                          )}
                          <button className={styles.actBtn} onClick={() => openGarageDetail(g)}>Info</button>
                          <button className={styles.actBtn} onClick={() => { setEditGarage(g); setParentOwner(null); setShowForm(true); }}>Edit</button>
                          <button className={styles.actBtn} style={{ color: "#b84538" }} onClick={() => setDeleteTarget(g)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <GarageFormModal garage={editGarage} parentOwner={parentOwner} onSave={handleSave} onClose={() => { setShowForm(false); setEditGarage(null); setParentOwner(null); }} loading={formLoading} />
      )}

      {showBikeCatalog && (
        <BikeCatalogModal
          loading={catalogLoading}
          items={vehicleMeta}
          form={catalogForm}
          onChange={(key, value) => setCatalogForm((prev) => ({ ...prev, [key]: value }))}
          onAddBrand={handleAddBrand}
          onAddModel={handleAddModel}
          onClose={() => setShowBikeCatalog(false)}
        />
      )}

      {detailTarget && (
        <GarageDetailModal
          target={detailTarget}
          detail={garageDetail}
          loading={detailLoading}
          onClose={() => { setDetailTarget(null); setGarageDetail(null); }}
        />
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className={styles.confirmBox}>
            <h3>Delete {deleteTarget.garageName}?</h3>
            <p style={{ color: "#7a9aaa", margin: "8px 0 20px", fontSize: "13px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className={styles.actBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.deleteBtn} onClick={handleDelete} disabled={formLoading}>{formLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function BikeCatalogModal({ loading, items, form, onChange, onAddBrand, onAddModel, onClose }) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.catalogModal}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Bike Brand / Model</h3>
            <p>Manage the 2-wheeler dropdown list used by the app.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>

        <div className={styles.catalogGrid}>
          <form className={styles.formPanel} onSubmit={onAddBrand}>
            <h4>Add brand</h4>
            <label>Brand name</label>
            <input value={form.brand} onChange={(e) => onChange("brand", e.target.value)} placeholder="Honda" />
            <label>Models, comma separated</label>
            <input value={form.models} onChange={(e) => onChange("models", e.target.value)} placeholder="Activa, Shine" />
            <button className={styles.saveBtn} disabled={loading}>{loading ? "Saving..." : "Add Brand"}</button>
          </form>

          <form className={styles.formPanel} onSubmit={onAddModel}>
            <h4>Add model</h4>
            <label>Brand</label>
            <select value={form.modelBrand} onChange={(e) => onChange("modelBrand", e.target.value)}>
              <option value="">Select brand</option>
              {items.map((item) => <option key={item._id} value={item.brand}>{item.brand}</option>)}
            </select>
            <label>Model</label>
            <input value={form.model} onChange={(e) => onChange("model", e.target.value)} placeholder="CB300R" />
            <button className={styles.saveBtn} disabled={loading}>{loading ? "Saving..." : "Add Model"}</button>
          </form>
        </div>

        <div className={styles.catalogList}>
          {items.length === 0 ? (
            <div className={styles.miniEmpty}>{loading ? "Loading catalog..." : "No bike brands added yet."}</div>
          ) : items.map((item) => (
            <div className={styles.catalogItem} key={item._id}>
              <strong>{item.brand}</strong>
              <span>{(item.models || []).length} models</span>
              <p>{(item.models || []).join(", ") || "No models yet"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GarageDetailModal({ target, detail, loading, onClose }) {
  const d = detail || {};
  const garage = d.garage || target;
  const totals = d.totals || {};

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.detailModal}>
        <div className={styles.modalHeader}>
          <div>
            <h3>{garage.garageName || "Garage info"}</h3>
            <p>{garage.garageAddress || "Full garage information"}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /><span>Loading garage info...</span></div>
        ) : (
          <>
            <div className={styles.detailStats}>
              <MiniStat label="Inventory" value={totals.inventoryItems} />
              <MiniStat label="Low Stock" value={totals.lowStockItems} />
              <MiniStat label="Services" value={totals.services} />
              <MiniStat label="History" value={totals.repairOrders} />
              <MiniStat label="Bookings" value={totals.bookings} />
              <MiniStat label="Revenue" value={money(totals.revenue)} />
            </div>

            <section className={styles.infoSection}>
              <h4>Garage profile</h4>
              <div className={styles.infoGrid}>
                <Info label="Owner" value={garage.owner?.fullName || garage.garageOwnerName} />
                <Info label="Owner phone" value={garage.owner?.phoneNo} />
                <Info label="Contact" value={garage.garageContactNumber} />
                <Info label="Type" value={GARAGE_TYPE_LABELS[garage.garageType] || garage.garageType} />
                <Info label="State" value={garage.state} />
                <Info label="GST" value={garage.isGstApplicable ? garage.gstNumber || "Applicable" : "No"} />
                <Info label="Franchise" value={garage.franchiseId?.name || "Unlinked"} />
                <Info label="Registered" value={fmtDate(garage.createdAt)} />
              </div>
            </section>

            <DetailTable
              title="Inventory"
              empty="No inventory items found."
              columns={["Part", "Category", "Qty", "Min", "Selling"]}
              rows={(d.inventory || []).map((item) => [
                item.partName || "-",
                item.category || "-",
                `${item.quantityInHand ?? 0} ${item.unit || ""}`.trim(),
                item.minimumStockLevel ?? 0,
                money(item.sellingPrice),
              ])}
            />
            <DetailTable
              title="Services"
              empty="No service records found."
              columns={["Date", "Type", "Status", "Payment", "Amount"]}
              rows={(d.services || []).map((item) => [
                fmtDate(item.serviceDate),
                item.serviceType || "-",
                item.serviceStatus || "-",
                item.paymentStatus || "-",
                money(item.totalAmount),
              ])}
            />
            <DetailTable
              title="Service history"
              empty="No repair order history found."
              columns={["Order", "Customer", "Status", "Created", "Amount"]}
              rows={(d.repairOrders || []).map((item) => [
                item.orderNo || String(item._id || "").slice(-6),
                item.customerId?.fullName || item.customerId?.phoneNo || "-",
                item.status || "-",
                fmtDate(item.createdAt),
                money(item.totalAmount),
              ])}
            />
            <DetailTable
              title="Bookings"
              empty="No bookings found."
              columns={["Booking", "Customer", "Service", "Scheduled", "Status"]}
              rows={(d.bookings || []).map((item) => [
                item.bookingNo || String(item._id || "").slice(-6),
                item.customer?.fullName || item.customer?.phoneNo || "-",
                item.serviceType || "-",
                fmtDate(item.scheduledAt),
                item.status || "-",
              ])}
            />
            <DetailTable
              title="Vehicles"
              empty="No linked vehicles found."
              columns={["Brand", "Model", "Register No.", "Customer"]}
              rows={(d.vehicles || []).map((item) => [
                item.vehicleBrand || "-",
                item.vehicleModel || "-",
                item.vehicleRegisterNo || "-",
                item.user?.fullName || item.user?.phoneNo || "-",
              ])}
            />
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return <div className={styles.miniStat}><span>{label}</span><strong>{value || 0}</strong></div>;
}

function Info({ label, value }) {
  return <div className={styles.infoItem}><span>{label}</span><strong>{value || "-"}</strong></div>;
}

function DetailTable({ title, columns, rows, empty }) {
  return (
    <section className={styles.infoSection}>
      <h4>{title}</h4>
      {rows.length === 0 ? <div className={styles.miniEmpty}>{empty}</div> : (
        <div className={styles.detailTableWrap}>
          <table className={styles.detailTable}>
            <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>{row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
