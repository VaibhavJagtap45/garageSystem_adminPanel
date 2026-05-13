import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import GarageFormModal from "../components/GarageFormModal";
import styles from "./Dashboard.module.css";
import { clearAdminSession } from "../utils/session";

const STATUS_COLORS = {
  pending: { bg: "#fff8e1", text: "#f59e0b", border: "#fde68a" },
  approved: { bg: "#ecfdf5", text: "#10b981", border: "#a7f3d0" },
  rejected: { bg: "#fff1f0", text: "#ef4444", border: "#fecaca" },
};

const GARAGE_TYPE_LABELS = {
  twoWheeler: "2-Wheeler",
  fourWheeler: "4-Wheeler",
};

function StatusBadge({ status }) {
  const s = status || "pending"; // old docs in DB may lack this field
  const c = STATUS_COLORS[s] || STATUS_COLORS.pending;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        padding: "3px 12px",
        fontSize: "0.78rem",
        fontWeight: 600,
      }}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function GarageCard({
  garage,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  actionLoading,
}) {
  const owner = garage.owner || {};
  const isLoading = actionLoading === garage._id;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.garageInfo}>
          {garage.garageLogo ? (
            <img
              src={garage.garageLogo}
              alt="logo"
              className={styles.garageLogo}
            />
          ) : (
            <div className={styles.logoPlaceholder}>🔧</div>
          )}
          <div>
            <h3 className={styles.garageName}>{garage.garageName}</h3>
            <p className={styles.garageOwner}>
              Owner: {garage.garageOwnerName}
            </p>
          </div>
        </div>
        <div className={styles.cardHeaderRight}>
          <StatusBadge status={garage.approvalStatus} />
          <div className={styles.cardActions2}>
            <button
              className={styles.editBtn}
              onClick={() => onEdit(garage)}
              title="Edit"
              disabled={isLoading}
            >
              ✎
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => onDelete(garage)}
              title="Delete"
              disabled={isLoading}
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoGrid}>
          <InfoRow
            icon="📞"
            label="Contact"
            value={garage.garageContactNumber}
          />
          <InfoRow icon="📍" label="Address" value={garage.garageAddress} />
          <InfoRow
            icon="🚗"
            label="Type"
            value={GARAGE_TYPE_LABELS[garage.garageType] || garage.garageType}
          />
          {garage.state && (
            <InfoRow icon="🗺️" label="State" value={garage.state} />
          )}
          {garage.isGstApplicable && (
            <InfoRow
              icon="🧾"
              label="GST"
              value={garage.gstNumber || "Applicable"}
            />
          )}
        </div>

        <div className={styles.ownerSection}>
          <p className={styles.ownerSectionTitle}>Registered User</p>
          <div className={styles.infoGrid}>
            {owner.fullName && (
              <InfoRow icon="👤" label="Name" value={owner.fullName} />
            )}
            {owner.phoneNo && (
              <InfoRow icon="📱" label="Phone" value={owner.phoneNo} />
            )}
            {owner.emailId && (
              <InfoRow icon="✉️" label="Email" value={owner.emailId} />
            )}
          </div>
        </div>

        <div className={styles.cardMeta}>
          Registered:{" "}
          {new Date(garage.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      {(garage.approvalStatus === "pending" || !garage.approvalStatus) && (
        <div className={styles.cardActions}>
          <button
            className={`${styles.actionBtn} ${styles.rejectBtn}`}
            onClick={() => onReject(garage._id)}
            disabled={isLoading}
          >
            {isLoading ? "..." : "✕ Reject"}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.approveBtn}`}
            onClick={() => onApprove(garage._id)}
            disabled={isLoading}
          >
            {isLoading ? "..." : "✓ Approve"}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoIcon}>{icon}</span>
      <span className={styles.infoLabel}>{label}:</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

// ── Delete confirmation dialog ────────────────────────────────────
function DeleteConfirm({ garage, onConfirm, onCancel, loading }) {
  return (
    <div
      className={styles.confirmOverlay}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className={styles.confirmBox}>
        <div className={styles.confirmIcon}>🗑️</div>
        <h3 className={styles.confirmTitle}>Delete Garage?</h3>
        <p className={styles.confirmText}>
          <strong>{garage.garageName}</strong> aur uska owner account
          permanently delete ho jayega. Ye action reverse nahi hogi.
        </p>
        <div className={styles.confirmActions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.confirmDeleteBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [garages, setGarages] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  // modal state
  const [showForm, setShowForm] = useState(false); // add/edit modal
  const [editGarage, setEditGarage] = useState(null); // null = add, obj = edit
  const [deleteTarget, setDeleteTarget] = useState(null); // confirm dialog

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/garages/stats");
      setStats(res.data.data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchGarages = useCallback(async (status) => {
    setLoading(true);
    setError("");
    try {
      const params = status === "all" ? {} : { status };
      const res = await api.get("/garages", { params });
      setGarages(res.data.data.garages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load garages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    fetchGarages(activeTab);
  }, [activeTab, fetchGarages]);

  const refresh = () => Promise.all([fetchStats(), fetchGarages(activeTab)]);

  // ── Approve / Reject ─────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/garages/${id}/approve`);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed.");
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
      alert(err.response?.data?.message || "Failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Add ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditGarage(null);
    setShowForm(true);
  };

  // ── Edit ─────────────────────────────────────────────────────────
  const handleEdit = (garage) => {
    setEditGarage(garage);
    setShowForm(true);
  };

  // ── Save (create or update) ──────────────────────────────────────
  const handleSave = async (payload) => {
    setFormLoading(true);
    try {
      if (editGarage) {
        await api.put(`/garages/${editGarage._id}`, payload);
      } else {
        await api.post("/garages", payload);
        // Switch to 'all' tab so user sees the new garage
        setActiveTab("all");
      }
      setShowForm(false);
      setEditGarage(null);
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────
  const handleDeleteClick = (garage) => setDeleteTarget(garage);
  const handleDeleteCancel = () => setDeleteTarget(null);

  const handleDeleteConfirm = async () => {
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

  // ── Logout ───────────────────────────────────────────────────────
  const handleLogout = () => {
    clearAdminSession();
    navigate("/login", { replace: true });
  };

  const tabs = [
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "all", label: "All Garages", count: stats.total },
  ];

  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <header className={styles.navbar}>
        <div className={styles.navBrand}>
          <span className={styles.navIcon}>🔧</span>
          <div>
            <span className={styles.navTitle}>Aapno Garage</span>
            <span className={styles.navSub}>Admin Panel</span>
          </div>
        </div>
        <div className={styles.navRight}>
          {stats.pending > 0 && (
            <div
              className={styles.notifBell}
              title={`${stats.pending} pending approval`}
            >
              🔔 <span className={styles.notifBadge}>{stats.pending}</span>
            </div>
          )}
          <button className={styles.addBtn} onClick={handleAdd}>
            + Add Garage
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className={styles.statsRow}>
        <StatCard label="Total" value={stats.total} color="#6366f1" />
        <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
        <StatCard label="Approved" value={stats.approved} color="#10b981" />
        <StatCard label="Rejected" value={stats.rejected} color="#ef4444" />
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabsBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`${styles.tabBadge} ${activeTab === t.key ? styles.tabBadgeActive : ""}`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <main className={styles.content}>
        {loading && (
          <div className={styles.centered}>
            <div className={styles.spinner} />
            <p>Loading...</p>
          </div>
        )}
        {!loading && error && <div className={styles.errorBox}>{error}</div>}
        {!loading && !error && garages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏪</span>
            <p>No garages here.</p>
            <button className={styles.emptyAddBtn} onClick={handleAdd}>
              + Add First Garage
            </button>
          </div>
        )}
        {!loading && !error && garages.length > 0 && (
          <div className={styles.grid}>
            {garages.map((g) => (
              <GarageCard
                key={g._id}
                garage={g}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <GarageFormModal
          garage={editGarage}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditGarage(null);
          }}
          loading={formLoading}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          garage={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={formLoading}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      className={styles.statCard}
      style={{ borderTop: `4px solid ${color}` }}
    >
      <span className={styles.statValue} style={{ color }}>
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
