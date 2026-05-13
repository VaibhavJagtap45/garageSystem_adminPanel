import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import styles from "./InvoiceFormModal.module.css";

const STATUS_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "in_progress", label: "In progress" },
  { value: "vehicle_ready", label: "Vehicle ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function emptyServiceRow() {
  return { name: "", price: 0, discount: 0, taxPercent: 0 };
}

function emptyPartRow() {
  return { name: "", quantity: 1, unitPrice: 0, discount: 0, taxPercent: 0, partCode: "" };
}

function computeServiceLineTotal(row) {
  const base = Math.max((Number(row.price) || 0) - (Number(row.discount) || 0), 0);
  return base * (1 + (Number(row.taxPercent) || 0) / 100);
}

function computePartLineTotal(row) {
  const qty = Math.max(Number(row.quantity) || 0, 0);
  const base = Math.max((Number(row.unitPrice) || 0) - (Number(row.discount) || 0), 0);
  return base * qty * (1 + (Number(row.taxPercent) || 0) / 100);
}

function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultEstimatedDelivery() {
  const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
  return toDatetimeLocal(d);
}

function CustomerVehicleTypeahead({ value, onChange, disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/repair-orders/search-customers", { params: { q } });
        setResults(res.data?.data?.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handlePick = (row) => {
    const c = row.customer || {};
    const v = row.vehicle;
    if (!v?._id) {
      alert("This customer has no vehicle linked. Pick a different row or add a vehicle in the mobile app first.");
      return;
    }
    onChange({
      customerId: c._id,
      vehicleId: v._id,
      customerName: c.fullName || "",
      customerPhone: c.phoneNo || "",
      vehicleLabel:
        `${v.vehicleBrand || ""} ${v.vehicleModel || ""}`.trim() +
        (v.vehicleRegisterNo ? ` (${v.vehicleRegisterNo})` : ""),
    });
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
  };

  return (
    <div className={styles.typeWrap} ref={wrapRef}>
      {value?.customerId ? (
        <div className={styles.selectedBox}>
          <div className={styles.selectedText}>
            <strong>{value.customerName || "Customer"}</strong>
            <span>
              {value.customerPhone || ""}
              {value.vehicleLabel ? ` · ${value.vehicleLabel}` : ""}
            </span>
          </div>
          {!disabled && (
            <button type="button" className={styles.linkBtn} onClick={handleClear}>
              Change
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            className={styles.input}
            placeholder="Search by customer name, phone or vehicle reg no (min 2 chars)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
          />
          {open && query.trim().length >= 2 && (
            <div className={styles.dropdown}>
              {loading ? (
                <div className={styles.dropEmpty}>Searching...</div>
              ) : results.length === 0 ? (
                <div className={styles.dropEmpty}>No matches</div>
              ) : (
                results.map((row, i) => {
                  const c = row.customer || {};
                  const v = row.vehicle;
                  return (
                    <button
                      key={`${c._id}-${v?._id || i}`}
                      type="button"
                      className={styles.dropItem}
                      onClick={() => handlePick(row)}
                    >
                      <span className={styles.dropName}>
                        {c.fullName || "Unnamed"}{" "}
                        <span className={styles.dropMeta}>{c.phoneNo || ""}</span>
                      </span>
                      <span className={styles.dropVehicle}>
                        {v
                          ? `${v.vehicleBrand || ""} ${v.vehicleModel || ""}`.trim() +
                            (v.vehicleRegisterNo ? ` · ${v.vehicleRegisterNo}` : "")
                          : "No vehicle linked — pick a different row"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RepairOrderFormModal({ order, activeGarageId, loading, onSave, onClose }) {
  const isEdit = Boolean(order?._id);

  const [customerCtx, setCustomerCtx] = useState(() => {
    if (!order) return null;
    const c = order.customerId;
    const v = order.vehicleId;
    if (!c) return null;
    return {
      customerId: c?._id || c,
      vehicleId: v?._id || v || null,
      customerName: c?.fullName || "",
      customerPhone: c?.phoneNo || "",
      vehicleLabel: v
        ? `${v.vehicleBrand || ""} ${v.vehicleModel || ""}`.trim() +
          (v.vehicleRegisterNo ? ` (${v.vehicleRegisterNo})` : "")
        : "",
    };
  });

  const [odometerReading, setOdometerReading] = useState(order?.odometerReading ?? "");
  const [vehicleVariant, setVehicleVariant] = useState(order?.vehicleVariant ?? "");

  const [services, setServices] = useState(() =>
    (order?.services || []).length
      ? order.services.map((s) => ({
          name: s.name || "",
          price: s.price || 0,
          discount: s.discount || 0,
          taxPercent: s.taxPercent || 0,
          catalogId: s.catalogId || null,
        }))
      : [emptyServiceRow()],
  );

  const [parts, setParts] = useState(() =>
    (order?.parts || []).length
      ? order.parts.map((p) => ({
          name: p.name || "",
          partCode: p.partCode || "",
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
          discount: p.discount || 0,
          taxPercent: p.taxPercent || 0,
          inventoryId: p.inventoryId || null,
        }))
      : [emptyPartRow()],
  );

  const [applyDiscountToAllServices, setApplyDiscountToAllServices] = useState(
    Boolean(order?.applyDiscountToAllServices),
  );
  const [applyDiscountToAllParts, setApplyDiscountToAllParts] = useState(
    Boolean(order?.applyDiscountToAllParts),
  );

  const [tagsInput, setTagsInput] = useState(() => (order?.tags || []).join(", "));
  const [remarksInput, setRemarksInput] = useState(() => (order?.customerRemarks || []).join("\n"));

  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(order?.scheduledAt));
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(
    order?.estimatedDeliveryAt
      ? toDatetimeLocal(order.estimatedDeliveryAt)
      : isEdit
        ? ""
        : defaultEstimatedDelivery(),
  );

  const [notifyCustomer, setNotifyCustomer] = useState(Boolean(order?.notifyCustomer));
  const [status, setStatus] = useState(order?.status || "created");
  const [assignedTo, setAssignedTo] = useState(order?.assignedTo?._id || order?.assignedTo || "");
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!isEdit || !activeGarageId) return;
    let cancelled = false;
    api
      .get("/repair-orders/garage-members", { params: { garageId: activeGarageId } })
      .then((res) => {
        if (cancelled) return;
        setMembers(res.data?.data?.members || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit, activeGarageId]);

  const totals = useMemo(() => {
    const laborTotal = services.reduce((s, r) => s + computeServiceLineTotal(r), 0);
    const partsTotal = parts.reduce((s, r) => s + computePartLineTotal(r), 0);
    return { laborTotal, partsTotal, grandTotal: laborTotal + partsTotal };
  }, [services, parts]);

  const updateRow = (setter, idx, key, value) => {
    setter((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerCtx?.customerId || !customerCtx?.vehicleId) {
      alert("Pick a customer with a linked vehicle first.");
      return;
    }
    const cleanServices = services
      .filter((s) => (s.name || "").trim())
      .map((s) => ({
        catalogId: s.catalogId || null,
        name: s.name.trim(),
        price: Number(s.price) || 0,
        discount: Number(s.discount) || 0,
        taxPercent: Number(s.taxPercent) || 0,
        entryMode: s.catalogId ? "catalog" : "manual",
      }));
    const cleanParts = parts
      .filter((p) => (p.name || "").trim())
      .map((p) => ({
        inventoryId: p.inventoryId || null,
        partCode: (p.partCode || "").trim() || null,
        name: p.name.trim(),
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        discount: Number(p.discount) || 0,
        taxPercent: Number(p.taxPercent) || 0,
        entryMode: p.inventoryId ? "catalog" : "manual",
      }));
    if (!cleanServices.length && !cleanParts.length) {
      alert("Add at least one service or part.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const customerRemarks = remarksInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      customerId: customerCtx.customerId,
      vehicleId: customerCtx.vehicleId,
      odometerReading: odometerReading === "" ? null : Number(odometerReading) || 0,
      vehicleVariant: vehicleVariant.trim() || null,
      services: cleanServices,
      applyDiscountToAllServices,
      parts: cleanParts,
      applyDiscountToAllParts,
      tags,
      customerRemarks,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      estimatedDeliveryAt: estimatedDeliveryAt
        ? new Date(estimatedDeliveryAt).toISOString()
        : null,
      notifyCustomer,
    };

    if (isEdit) {
      payload.status = status;
      payload.assignedTo = assignedTo || null;
      if (assignedTo && !order?.assignedAt) {
        payload.assignedAt = new Date().toISOString();
      }
    }

    onSave(payload, { mode: isEdit ? "edit" : "create" });
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div>
            <h3>{isEdit ? `Edit order ${order?.orderNo || ""}` : "New repair order"}</h3>
            <p>Acting on behalf of the selected garage.</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <label className={styles.sectionLabel}>Customer &amp; vehicle</label>
            <CustomerVehicleTypeahead
              value={customerCtx}
              onChange={setCustomerCtx}
              disabled={isEdit}
            />
          </section>

          <section className={styles.section}>
            <div className={styles.totalsGrid}>
              <div className={styles.totalsField}>
                <label>Odometer reading</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  placeholder="e.g. 45230"
                />
              </div>
              <div className={styles.totalsField}>
                <label>Vehicle variant</label>
                <input
                  type="text"
                  value={vehicleVariant}
                  onChange={(e) => setVehicleVariant(e.target.value)}
                  placeholder="e.g. Petrol VX"
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.lineHeader}>
              <label className={styles.sectionLabel}>Services</label>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={() => setServices((rows) => [...rows, emptyServiceRow()])}
              >
                + Add service
              </button>
            </div>
            <div className={styles.linesTable}>
              <div className={`${styles.lineRow} ${styles.lineHead}`}>
                <span>Name</span>
                <span>Price</span>
                <span>Disc</span>
                <span>Tax %</span>
                <span>Line total</span>
                <span />
              </div>
              {services.map((row, idx) => (
                <div key={idx} className={styles.lineRow}>
                  <input
                    type="text"
                    placeholder="Service name"
                    value={row.name}
                    onChange={(e) => updateRow(setServices, idx, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(e) => updateRow(setServices, idx, "price", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.discount}
                    onChange={(e) => updateRow(setServices, idx, "discount", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.taxPercent}
                    onChange={(e) => updateRow(setServices, idx, "taxPercent", e.target.value)}
                  />
                  <span className={styles.lineTotal}>{money(computeServiceLineTotal(row))}</span>
                  <button
                    type="button"
                    className={styles.rowRemove}
                    onClick={() =>
                      setServices((rows) =>
                        rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows,
                      )
                    }
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={applyDiscountToAllServices}
                onChange={(e) => setApplyDiscountToAllServices(e.target.checked)}
              />
              Apply discount to all services
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.lineHeader}>
              <label className={styles.sectionLabel}>Parts</label>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={() => setParts((rows) => [...rows, emptyPartRow()])}
              >
                + Add part
              </button>
            </div>
            <div className={styles.linesTable}>
              <div className={`${styles.lineRow} ${styles.partRow} ${styles.lineHead}`}>
                <span>Name</span>
                <span>Code</span>
                <span>Qty</span>
                <span>Unit ₹</span>
                <span>Disc</span>
                <span>Tax %</span>
                <span>Line total</span>
                <span />
              </div>
              {parts.map((row, idx) => (
                <div key={idx} className={`${styles.lineRow} ${styles.partRow}`}>
                  <input
                    type="text"
                    placeholder="Part name"
                    value={row.name}
                    onChange={(e) => updateRow(setParts, idx, "name", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="—"
                    value={row.partCode}
                    onChange={(e) => updateRow(setParts, idx, "partCode", e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(setParts, idx, "quantity", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(setParts, idx, "unitPrice", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.discount}
                    onChange={(e) => updateRow(setParts, idx, "discount", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.taxPercent}
                    onChange={(e) => updateRow(setParts, idx, "taxPercent", e.target.value)}
                  />
                  <span className={styles.lineTotal}>{money(computePartLineTotal(row))}</span>
                  <button
                    type="button"
                    className={styles.rowRemove}
                    onClick={() =>
                      setParts((rows) =>
                        rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows,
                      )
                    }
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={applyDiscountToAllParts}
                onChange={(e) => setApplyDiscountToAllParts(e.target.checked)}
              />
              Apply discount to all parts
            </label>
          </section>

          <section className={styles.section}>
            <label className={styles.sectionLabel}>Tags</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Comma-separated tags (e.g. servicing, urgent)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </section>

          <section className={styles.section}>
            <label className={styles.sectionLabel}>Customer remarks</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              placeholder="One remark per line"
            />
          </section>

          <section className={styles.totalsSection}>
            <div className={styles.totalsGrid}>
              <div className={styles.totalsField}>
                <label>Scheduled at (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className={styles.totalsField}>
                <label>Estimated delivery</label>
                <input
                  type="datetime-local"
                  value={estimatedDeliveryAt}
                  onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                />
              </div>
              {isEdit && (
                <>
                  <div className={styles.totalsField}>
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.totalsField}>
                    <label>Assigned mechanic</label>
                    <select
                      value={assignedTo || ""}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.fullName || m.phoneNo}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className={styles.totalsSummary}>
              <div>
                <span>Labour total</span>
                <strong>{money(totals.laborTotal)}</strong>
              </div>
              <div>
                <span>Parts total</span>
                <strong>{money(totals.partsTotal)}</strong>
              </div>
              <div className={styles.grandTotal}>
                <span>Grand total (est.)</span>
                <strong>{money(totals.grandTotal)}</strong>
              </div>
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
              />
              Notify customer (SMS &amp; email)
            </label>
          </section>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save changes" : "Create order"}
          </button>
        </div>
      </form>
    </div>
  );
}
