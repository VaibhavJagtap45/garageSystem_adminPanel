import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Layout from "../components/Layout";
import styles from "./FranchiseManagementPro.module.css";

function Icon({ d, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const emptyForm = {
  name: "",
  code: "",
  contactNumber: "",
  headOfficeAddress: "",
  gstNumber: "",
  plan: "basic",
  sharingPolicy: {
    shareServices: true,
    allowInventoryTransfer: true,
  },
};

export default function FranchiseManagementPro() {
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get("/franchises"),
        api.get("/franchises/stats"),
      ]);
      setFranchises(listRes.data?.data?.franchises || []);
      setStats(statsRes.data?.data || stats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/franchises/${editId}`, form);
      } else {
        await api.post("/franchises", form);
      }
      setForm(emptyForm);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/franchises/${id}/${status}`);
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this franchise?")) return;
    await api.delete(`/franchises/${id}`);
    await load();
  };

  const filteredFranchises = franchises.filter((f) => {
    if (statusFilter !== "all" && f.approvalStatus !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(f.name || "").toLowerCase().includes(q) ||
      String(f.code || "").toLowerCase().includes(q) ||
      String(f.contactNumber || "").toLowerCase().includes(q)
    );
  });

  return (
    <Layout title="Franchise Management">
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroEyebrow}>Network</p>
        <h1 className={styles.heroTitle}>Franchise operations</h1>
        <p className={styles.heroSubtitle}>
          Create and approve franchise accounts, set shared services and cross-branch inventory rules, and open each
          network to manage garage branches.
        </p>
      </header>

      <div className={styles.statsRow}>
        <Stat label="Total" value={stats.total} variant="total" />
        <Stat label="Pending" value={stats.pending} variant="pending" />
        <Stat label="Approved" value={stats.approved} variant="approved" />
        <Stat label="Rejected" value={stats.rejected} variant="rejected" />
      </div>

      <div className={styles.planStrip}>
        <PlanPill label="Basic" hint="Up to 1 garage · standard billing" />
        <PlanPill label="Franchise" hint="Up to 3 garages · multi-branch" />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelIcon}>
              <Icon d={["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"]} />
            </div>
            <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>{editId ? "Edit franchise" : "Create franchise"}</h3>
          </div>
          <p className={styles.panelHint}>Codes are shown uppercase. Sharing options apply to all branches in the network.</p>
          <form onSubmit={save} className={styles.form}>
            <input className={styles.input} placeholder="Franchise name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className={styles.input} placeholder="Code (e.g. APNO-MUMBAI)" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required />
            <div className={styles.row}>
              <input className={styles.input} placeholder="Contact number" value={form.contactNumber} onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))} />
              <input className={styles.input} placeholder="GST number" value={form.gstNumber} onChange={(e) => setForm((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() }))} />
            </div>
            <textarea className={styles.textarea} placeholder="Head office address" value={form.headOfficeAddress} onChange={(e) => setForm((p) => ({ ...p, headOfficeAddress: e.target.value }))} />
            <select className={styles.select} value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}>
              <option value="basic">Basic</option>
              <option value="franchise">Franchise</option>
            </select>
            <div className={styles.checkGrid}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!form?.sharingPolicy?.shareServices}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sharingPolicy: { ...(p.sharingPolicy || {}), shareServices: e.target.checked },
                    }))
                  }
                />
                Share services
              </label>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!form?.sharingPolicy?.allowInventoryTransfer}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sharingPolicy: { ...(p.sharingPolicy || {}), allowInventoryTransfer: e.target.checked },
                    }))
                  }
                />
                Allow inventory transfer
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit" disabled={saving}>
                {saving ? "Saving…" : editId ? "Update franchise" : "Create franchise"}
              </button>
              {editId && (
                <button className={styles.button} type="button" onClick={() => { setForm(emptyForm); setEditId(null); }}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.directoryTop}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>Franchise directory</h3>
            <div className={styles.filters}>
              <input
                className={styles.input}
                placeholder="Search name, code, number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {loading ? <p className={styles.empty}>Loading directory…</p> : (
            <div className={styles.list}>
              {filteredFranchises.map((f) => (
                <div key={f._id} className={styles.card}>
                  <div className={styles.cardInner}>
                    <div className={styles.cardTop}>
                      <div>
                        <div className={styles.name}>
                          {f.name} <span className={styles.code}>({f.code})</span>
                        </div>
                        <div className={styles.meta}>
                          Plan: {f.plan || "basic"} · Garages: {f.garageCapacityLabel || "—"} · {f?.isOverGarageLimit ? "Over plan limit" : "Within plan limit"}
                        </div>
                      </div>
                      <FranchiseStatusPill status={f.approvalStatus} />
                    </div>
                    <div className={styles.chips}>
                      <span className={styles.chip}>Services: {f?.sharingPolicy?.shareServices ? "Shared" : "Isolated"}</span>
                      <span className={styles.chip}>Transfers: {f?.sharingPolicy?.allowInventoryTransfer ? "On" : "Off"}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.btnView} type="button" onClick={() => navigate(`/franchises/${f._id}`)}>Open</button>
                    <button className={styles.btnEdit} type="button" onClick={() => { setEditId(f._id); setForm({ ...emptyForm, ...f, sharingPolicy: { ...emptyForm.sharingPolicy, ...(f.sharingPolicy || {}) } }); }}>Edit</button>
                    <button className={styles.btnApprove} type="button" onClick={() => setStatus(f._id, "approve")}>Approve</button>
                    <button className={styles.btnReject} type="button" onClick={() => setStatus(f._id, "reject")}>Reject</button>
                    <button className={styles.btnDelete} type="button" onClick={() => remove(f._id)}>Delete</button>
                  </div>
                </div>
              ))}
              {!filteredFranchises.length && (
                <div className={styles.empty} role="status">
                  <Icon
                    d={["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"]}
                    className={styles.emptyStateIcon}
                  />
                  <p className={styles.emptyText}>No franchise matches your search or status filter.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
    </Layout>
  );
}

function FranchiseStatusPill({ status }) {
  const s = String(status || "pending").toLowerCase();
  const cls =
    s === "approved" ? styles.statusApproved : s === "rejected" ? styles.statusRejected : styles.statusPending;
  return (
    <span className={`${styles.statusPill} ${cls}`}>
      <span className={styles.statusDot} />
      {s}
    </span>
  );
}

function PlanPill({ label, hint }) {
  return (
    <div className={styles.planPill}>
      <div className={styles.planPillName}>{label}</div>
      <div className={styles.planPillHint}>{hint}</div>
    </div>
  );
}

const STAT_PATHS = {
  total: ["M3 3h7v7H3V3zM14 3h7v7h-7V3zM14 14h7v7h-7v-7zM3 14h7v7H3v-7z"],
  pending: ["M12 8v4M12 16h.01", "M12 2a10 10 0 100 20 10 10 0 000-20z"],
  approved: ["M20 6L9 17l-5-5"],
  rejected: ["M6 6l12 12M18 6L6 18"],
};

function Stat({ label, value, variant }) {
  return (
    <div className={`${styles.stat} ${styles[`stat${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}>
      <div className={`${styles.statIcon} ${styles[`statIcon${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}>
        <Icon d={STAT_PATHS[variant] || STAT_PATHS.total} className={styles.statIconSvg} />
      </div>
      <div className={styles.statBody}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value ?? 0}</div>
      </div>
    </div>
  );
}
