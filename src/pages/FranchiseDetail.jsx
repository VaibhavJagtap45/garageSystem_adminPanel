import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Layout from "../components/Layout";
import GarageFormModal from "../components/GarageFormModalPro";
import styles from "./FranchiseDetail.module.css";

const GARAGE_TYPE_LABELS = {
  twoWheeler: "2-Wheeler",
  fourWheeler: "4-Wheeler",
  both: "Both",
};

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
      {Array.isArray(d)
        ? d.map((p, i) => <path key={i} d={p} />)
        : <path d={d} />}
    </svg>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? styles.statusApproved
      : status === "rejected"
        ? styles.statusRejected
        : styles.statusPending;
  return (
    <span className={`${styles.statusBadge} ${cls}`}>
      <span className={styles.statusDot} />
      {status || "pending"}
    </span>
  );
}

function CapacityBar({ used, limit }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? Math.min((used / 20) * 100, 100) : Math.min((used / limit) * 100, 100);
  const isOver = !isUnlimited && used > limit;
  const barClass = isOver ? styles.capacityBarOver : pct > 80 ? styles.capacityBarWarn : styles.capacityBarOk;

  return (
    <div className={styles.capacityWrap}>
      <div className={styles.capacityHeader}>
        <span className={styles.capacityLabel}>Branch capacity</span>
        <span className={styles.capacityCount}>
          {used} / {isUnlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div className={styles.capacityTrack}>
        <div className={`${styles.capacityFill} ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      {isOver && <span className={styles.capacityOverText}>Over plan limit</span>}
    </div>
  );
}

export default function FranchiseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState(null);
  const [garages, setGarages] = useState([]);
  const [allGarages, setAllGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/franchises/${id}`);
      const d = res.data?.data;
      setFranchise(d?.franchise || null);
      setGarages(d?.garages || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load franchise");
      navigate("/franchises");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const loadUnlinkedGarages = useCallback(async () => {
    try {
      const res = await api.get("/garages", { params: { status: "approved" } });
      const all = res.data?.data?.garages || [];
      setAllGarages(all.filter((g) => !g.franchiseId));
    } catch {
      setAllGarages([]);
    }
  }, []);

  const handleAddBranch = () => {
    setEditBranch(null);
    setShowForm(true);
  };

  const handleEditBranch = (garage) => {
    setEditBranch(garage);
    setShowForm(true);
  };

  const handleSaveBranch = async (payload, ctx = {}) => {
    setFormLoading(true);
    try {
      if (ctx.mode === "edit" && editBranch) {
        payload.franchiseId = id;
        await api.put(`/garages/${editBranch._id}`, payload);
      } else {
        payload.franchiseId = id;
        await api.post("/garages", payload);
      }
      setShowForm(false);
      setEditBranch(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save branch");
    } finally {
      setFormLoading(false);
    }
  };

  const handleApproveBranch = async (garageId) => {
    setActionLoading(garageId);
    try {
      await api.patch(`/garages/${garageId}/approve`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBranch = async (garageId) => {
    setActionLoading(garageId);
    try {
      await api.patch(`/garages/${garageId}/reject`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlinkBranch = async (garageId) => {
    if (!window.confirm("Unlink this garage from the franchise?")) return;
    setActionLoading(garageId);
    try {
      await api.patch(`/franchises/unlink-garage/${garageId}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unlink");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBranch = async (garageId, garageName) => {
    if (!window.confirm(`Delete "${garageName}" permanently?`)) return;
    setActionLoading(garageId);
    try {
      await api.delete(`/garages/${garageId}`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenLinkModal = async () => {
    setShowLinkModal(true);
    setLinkSearch("");
    await loadUnlinkedGarages();
  };

  const handleLinkGarage = async (garageId) => {
    setLinkLoading(true);
    try {
      await api.patch(`/franchises/${id}/link-garage`, { garageId });
      setShowLinkModal(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to link garage");
    } finally {
      setLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Franchise Detail">
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>Loading franchise...</span>
        </div>
      </Layout>
    );
  }

  if (!franchise) return null;

  const owner = franchise.franchiseOwner;
  const garageLimit = franchise.garageLimit ?? 1;
  const garageCount = garages.length;
  const canAddGarage = garageLimit === -1 || garageCount < garageLimit;

  const filteredUnlinked = allGarages.filter((g) => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (g.garageName || "").toLowerCase().includes(q) ||
      (g.garageOwnerName || "").toLowerCase().includes(q) ||
      (g.garageContactNumber || "").includes(q)
    );
  });

  return (
    <Layout title="Franchise detail">
      <div className={styles.pageShell}>
      <button className={styles.backBtn} onClick={() => navigate("/franchises")}>
        <SmallIcon d="M15 18l-6-6 6-6" className={styles.backIcon} />
        Back to Franchises
      </button>

      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerIdentity}>
            {franchise.logo ? (
              <img src={franchise.logo} alt="" className={styles.headerLogo} />
            ) : (
              <div className={styles.headerLogoFallback}>
                <span>{(franchise.name || "F")[0]}</span>
              </div>
            )}
            <div>
              <div className={styles.headerTitleRow}>
                <h2 className={styles.headerTitle}>{franchise.name}</h2>
                <span className={styles.headerCode}>{franchise.code}</span>
                <StatusBadge status={franchise.approvalStatus} />
              </div>
              <div className={styles.headerMeta}>
                {franchise.planDetails?.name || franchise.plan || "Basic"} plan
                {franchise.contactNumber && <> &middot; {franchise.contactNumber}</>}
                {franchise.gstNumber && <> &middot; GST: {franchise.gstNumber}</>}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerBody}>
          <div className={styles.detailGrid}>
            {owner && (
              <>
                <Detail label="Franchise Owner" value={owner.fullName || "\u2014"} />
                <Detail label="Owner Phone" value={owner.phoneNo || "\u2014"} />
                <Detail label="Owner Email" value={owner.emailId || "\u2014"} />
              </>
            )}
            <Detail label="Contact Number" value={franchise.contactNumber || "\u2014"} />
            <Detail label="GST Number" value={franchise.gstNumber || "\u2014"} />
            <Detail label="Head Office" value={franchise.headOfficeAddress || "\u2014"} />
          </div>

          <div className={styles.policyChips}>
            <span className={`${styles.policyChip} ${franchise.sharingPolicy?.shareServices ? styles.policyOn : styles.policyOff}`}>
              Services: {franchise.sharingPolicy?.shareServices ? "Shared" : "Isolated"}
            </span>
            <span className={`${styles.policyChip} ${franchise.sharingPolicy?.allowInventoryTransfer ? styles.policyOn : styles.policyOff}`}>
              Inventory Transfer: {franchise.sharingPolicy?.allowInventoryTransfer ? "Enabled" : "Disabled"}
            </span>
          </div>

          <CapacityBar used={garageCount} limit={garageLimit} />
        </div>
      </div>

      <div className={styles.branchesSection}>
        <div className={styles.branchesHeader}>
          <div className={styles.branchesHeaderLeft}>
            <h3 className={styles.branchesTitle}>Garage Branches</h3>
            <span className={styles.branchCount}>{garageCount}</span>
          </div>
          <div className={styles.branchesActions}>
            <button className={styles.linkBtn} onClick={handleOpenLinkModal} disabled={!canAddGarage}>
              <SmallIcon d={["M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"]} className={styles.btnIcon} />
              Link Existing Garage
            </button>
            <button className={styles.addBranchBtn} onClick={handleAddBranch} disabled={!canAddGarage}>
              <SmallIcon d={["M12 5v14", "M5 12h14"]} className={styles.btnIcon} />
              Add New Branch
            </button>
          </div>
        </div>

        {garageCount === 0 ? (
          <div className={styles.emptyBranches}>
            <div className={styles.emptyIcon}>
              <SmallIcon
                d={["M5 14l1.5-4.5A2 2 0 018.4 8h7.2a2 2 0 011.9 1.5L19 14", "M4 14h16v4H4z"]}
                className={styles.emptyIconSvg}
              />
            </div>
            <div className={styles.emptyTitle}>No branches yet</div>
            <div className={styles.emptyText}>
              Add the first branch for this franchise or link an existing garage.
            </div>
            <div className={styles.emptyActions}>
              <button className={styles.linkBtn} onClick={handleOpenLinkModal} disabled={!canAddGarage}>
                Link Existing Garage
              </button>
              <button className={styles.addBranchBtn} onClick={handleAddBranch} disabled={!canAddGarage}>
                Add New Branch
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.branchGrid}>
            {garages.map((g) => (
              <BranchCard
                key={g._id}
                garage={g}
                isLoading={actionLoading === g._id}
                onEdit={() => handleEditBranch(g)}
                onApprove={() => handleApproveBranch(g._id)}
                onReject={() => handleRejectBranch(g._id)}
                onUnlink={() => handleUnlinkBranch(g._id)}
                onDelete={() => handleDeleteBranch(g._id, g.garageName)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <GarageFormModal
          garage={editBranch}
          mode={editBranch ? "edit" : "create"}
          franchiseId={id}
          onSave={handleSaveBranch}
          onClose={() => {
            setShowForm(false);
            setEditBranch(null);
          }}
          loading={formLoading}
        />
      )}

      {showLinkModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowLinkModal(false)}>
          <div className={styles.linkModal}>
            <div className={styles.linkModalHeader}>
              <div>
                <h3 className={styles.linkModalTitle}>Link Existing Garage</h3>
                <p className={styles.linkModalText}>
                  Select an unlinked garage to add as a branch of this franchise.
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowLinkModal(false)}>
                <SmallIcon d={["M6 6l12 12", "M18 6L6 18"]} className={styles.closeBtnIcon} />
              </button>
            </div>

            <input
              className={styles.linkSearchInput}
              placeholder="Search by name, owner, or contact..."
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />

            <div className={styles.linkList}>
              {filteredUnlinked.length === 0 ? (
                <div className={styles.linkEmpty}>No unlinked garages found.</div>
              ) : (
                filteredUnlinked.map((g) => (
                  <div key={g._id} className={styles.linkItem}>
                    <div className={styles.linkItemInfo}>
                      <div className={styles.linkItemName}>{g.garageName}</div>
                      <div className={styles.linkItemMeta}>
                        {g.garageOwnerName || "Unknown owner"} &middot; {g.garageContactNumber || "No contact"} &middot; {g.state || "No state"}
                      </div>
                    </div>
                    <button
                      className={styles.linkItemBtn}
                      onClick={() => handleLinkGarage(g._id)}
                      disabled={linkLoading}
                    >
                      {linkLoading ? "Linking..." : "Link"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

function Detail({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function BranchCard({ garage, isLoading, onEdit, onApprove, onReject, onUnlink, onDelete }) {
  const owner = garage.owner || {};
  const type = GARAGE_TYPE_LABELS[garage.garageType] || garage.garageType;
  const isPending = (garage.approvalStatus || "pending") === "pending";

  return (
    <div className={styles.branchCard}>
      <div className={styles.branchCardTop}>
        <div className={styles.branchCardIdentity}>
          {garage.garageLogo ? (
            <img src={garage.garageLogo} alt="" className={styles.branchLogo} />
          ) : (
            <div className={styles.branchLogoFallback}>
              {(garage.garageName || "G")[0]}
            </div>
          )}
          <div>
            <div className={styles.branchNameRow}>
              <span className={styles.branchName}>{garage.garageName || "Unnamed"}</span>
              {garage.isPrimaryBranch && <span className={styles.primaryBadge}>Primary</span>}
            </div>
            <StatusBadge status={garage.approvalStatus} />
          </div>
        </div>
      </div>

      <div className={styles.branchDetails}>
        <div className={styles.branchDetail}>
          <SmallIcon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" className={styles.branchDetailIcon} />
          <span>{owner.fullName || garage.garageOwnerName || "\u2014"}</span>
          {owner.phoneNo && <span className={styles.detailSep}>&middot;</span>}
          {owner.phoneNo && <span>{owner.phoneNo}</span>}
        </div>
        <div className={styles.branchDetail}>
          <SmallIcon d="M7 5h3l1 4-2 1.5a15 15 0 006 6L16 14l4 1v3a2 2 0 01-2.2 2A17 17 0 014 6.2 2 2 0 016 4h1z" className={styles.branchDetailIcon} />
          <span>{garage.garageContactNumber || "\u2014"}</span>
        </div>
        <div className={styles.branchDetail}>
          <SmallIcon d="M12 21s6-4.35 6-10a6 6 0 10-12 0c0 5.65 6 10 6 10z" className={styles.branchDetailIcon} />
          <span>{garage.garageAddress || "\u2014"}</span>
        </div>
      </div>

      <div className={styles.branchChips}>
        <span className={styles.chip}>{type}</span>
        {garage.state && <span className={styles.chip}>{garage.state}</span>}
        {garage.isGstApplicable && <span className={`${styles.chip} ${styles.chipGst}`}>GST</span>}
      </div>

      <div className={styles.branchActions}>
        {isPending && (
          <>
            <button className={`${styles.branchBtn} ${styles.approveBtn}`} onClick={onApprove} disabled={isLoading}>
              <SmallIcon d="M5 13l4 4L19 7" className={styles.branchBtnIcon} />
              Approve
            </button>
            <button className={`${styles.branchBtn} ${styles.rejectBtn}`} onClick={onReject} disabled={isLoading}>
              <SmallIcon d={["M6 6l12 12", "M18 6L6 18"]} className={styles.branchBtnIcon} />
              Reject
            </button>
          </>
        )}
        <button className={`${styles.branchBtn} ${styles.editBtn}`} onClick={onEdit} disabled={isLoading}>
          <SmallIcon d={["M4 20h4l10-10-4-4L4 16v4z", "M13 7l4 4"]} className={styles.branchBtnIcon} />
          Edit
        </button>
        <button className={`${styles.branchBtn} ${styles.unlinkBtn}`} onClick={onUnlink} disabled={isLoading}>
          <SmallIcon d={["M18 6L6 18", "M8 2v4", "M16 2v4", "M8 18v4", "M16 18v4"]} className={styles.branchBtnIcon} />
          Unlink
        </button>
        <button className={`${styles.branchBtn} ${styles.deleteBtn}`} onClick={onDelete} disabled={isLoading}>
          <SmallIcon d={["M5 7h14", "M9 7V5h6v2", "M6 7l1 12h10l1-12"]} className={styles.branchBtnIcon} />
          Delete
        </button>
      </div>
    </div>
  );
}
