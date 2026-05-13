import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import styles from "./UserManagement.module.css";

const ROLE_CLASSES = {
  owner: styles.roleOwner,
  manager: styles.roleManager,
  staff: styles.roleStaff,
  member: styles.roleStaff,
  customer: styles.roleCustomer,
  vendor: styles.roleVendor,
};

const ROLES = [
  { value: "", label: "All Roles" },
  { value: "owner", label: "Owners" },
  { value: "manager", label: "Managers" },
  { value: "staff", label: "Staff" },
  { value: "member", label: "Members" },
  { value: "customer", label: "Customers" },
  { value: "vendor", label: "Vendors" },
];

function fmt(v) {
  return new Intl.NumberFormat("en-IN").format(v || 0);
}

function fmtDate(v) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({});
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (role) params.role = role;
      if (search.trim()) params.search = search.trim();
      const [usersRes, statsRes] = await Promise.all([
        api.get("/users", { params }),
        page === 1 ? api.get("/users/stats") : Promise.resolve(null),
      ]);
      setUsers(usersRes.data?.data?.users || []);
      setTotal(usersRes.data?.data?.total || 0);
      if (statsRes) setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error("User load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [role, search]);

  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <Layout title="User Management">
      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Total Users" value={fmt(stats.total)} />
        <StatCard label="Owners" value={fmt(stats.owners)} />
        <StatCard label="Managers" value={fmt(stats.managers)} />
        <StatCard label="Staff" value={fmt(stats.staff)} />
        <StatCard label="Customers" value={fmt(stats.customers)} />
        <StatCard label="Vendors" value={fmt(stats.vendors)} />
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.roleFilter} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /><span>Loading users...</span></div>
      ) : users.length === 0 ? (
        <div className={styles.emptyState}>No users found for current filters.</div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <span className={styles.tableTitle}>Users</span>
            <span className={styles.tableCount}>{fmt(total)} total</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td data-label="Name">{u.fullName || "—"}</td>
                    <td data-label="Phone">{u.phoneNo || "—"}</td>
                    <td data-label="Email">{u.emailId || "—"}</td>
                    <td data-label="Role">
                      <span className={`${styles.roleBadge} ${ROLE_CLASSES[u.role] || styles.roleDefault}`}>
                        {u.role}
                      </span>
                    </td>
                    <td data-label="Verified">
                      <span className={u.isVerified ? styles.verifiedBadge : styles.unverifiedBadge}>
                        {u.isVerified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td data-label="Registered">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}
