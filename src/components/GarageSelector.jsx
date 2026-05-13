import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { useActiveGarage } from "../context/ActiveGarageContext";
import styles from "./GarageSelector.module.css";

export default function GarageSelector() {
  const { activeGarageId, activeGarageName, setActiveGarage } = useActiveGarage();
  const [open, setOpen] = useState(false);
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const loadGarages = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/garages", { params: { limit: 500 } });
      const list = res?.data?.data?.garages ?? [];
      // eslint-disable-next-line no-console
      console.log("[GarageSelector] loaded", list.length, "garages", list);
      setGarages(Array.isArray(list) ? list : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[GarageSelector] load failed", err);
      setLoadError(
        err?.response?.data?.message || err?.message || "Failed to load garages.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount — keeps the dropdown ready and avoids any open/load races.
  useEffect(() => {
    loadGarages();
  }, [loadGarages]);

  useEffect(() => {
    if (!open) return;
    const handleDocPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocPointer);
    return () => document.removeEventListener("mousedown", handleDocPointer);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return garages;
    return garages.filter((g) => {
      const name = (g.garageName || "").toLowerCase();
      const owner = (g.owner?.fullName || g.garageOwnerName || "").toLowerCase();
      const phone = (g.garageContactNumber || "").toLowerCase();
      return name.includes(q) || owner.includes(q) || phone.includes(q);
    });
  }, [garages, query]);

  const handlePick = (g) => {
    setActiveGarage({ id: g._id, garageName: g.garageName });
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    setActiveGarage(null);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${activeGarageId ? styles.triggerSet : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={activeGarageName || "No garage selected"}
      >
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 14l1.5-4.5A2 2 0 018.4 8h7.2a2 2 0 011.9 1.5L19 14" />
          <path d="M4 14h16v4H4z" />
          <path d="M7 18h.01" />
          <path d="M17 18h.01" />
        </svg>
        <span className={styles.triggerLabel}>
          {activeGarageId ? activeGarageName || "Selected garage" : "Select garage"}
        </span>
        <svg
          className={styles.caret}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.searchRow}>
            <input
              autoFocus
              type="text"
              className={styles.searchInput}
              placeholder="Search garage by name, owner, phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {activeGarageId && (
              <button type="button" className={styles.clearBtn} onClick={handleClear}>
                Clear
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.listEmpty}>Loading garages...</div>
            ) : loadError ? (
              <div className={styles.listEmpty}>
                <div style={{ color: "#b84538", marginBottom: 8 }}>{loadError}</div>
                <button type="button" className={styles.clearBtn} onClick={loadGarages}>
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.listEmpty}>
                {garages.length === 0
                  ? "No garages found."
                  : "No garages match your search."}
              </div>
            ) : (
              filtered.map((g) => {
                const isActive = activeGarageId === g._id;
                const status = g.approvalStatus || "";
                return (
                  <button
                    key={g._id}
                    type="button"
                    className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                    onMouseDown={(e) => {
                      // Fire selection on mousedown so it lands BEFORE input blur
                      // and before the click-outside listener evaluates the target.
                      e.preventDefault();
                      handlePick(g);
                    }}
                  >
                    <span className={styles.itemName}>
                      {g.garageName || "Unnamed garage"}
                      {status && status !== "approved" && (
                        <span className={styles.itemStatus}>{status}</span>
                      )}
                    </span>
                    <span className={styles.itemMeta}>
                      {g.owner?.fullName || g.garageOwnerName || "—"}
                      {g.garageContactNumber ? ` · ${g.garageContactNumber}` : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
