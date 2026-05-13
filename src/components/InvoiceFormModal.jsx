import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import styles from "./InvoiceFormModal.module.css";

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
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
        const res = await api.get("/repair-orders/search-customers", {
          params: { q },
        });
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

  const displayValue = useMemo(() => {
    if (!value?.customerId) return "";
    const parts = [value.customerName || "Customer"];
    if (value.customerPhone) parts.push(value.customerPhone);
    if (value.vehicleLabel) parts.push(value.vehicleLabel);
    return parts.join(" · ");
  }, [value]);

  const handlePick = (row) => {
    const customer = row.customer || {};
    const vehicle = row.vehicle || null;
    onChange({
      customerId: customer._id,
      vehicleId: vehicle?._id || null,
      customerName: customer.fullName || "",
      customerPhone: customer.phoneNo || "",
      vehicleLabel: vehicle
        ? `${vehicle.vehicleBrand || ""} ${vehicle.vehicleModel || ""}`.trim() +
          (vehicle.vehicleRegisterNo ? ` (${vehicle.vehicleRegisterNo})` : "")
        : "",
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
                          : "No vehicle linked"}
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

export default function InvoiceFormModal({ invoice, activeGarageId, loading, onSave, onClose }) {
  const isEdit = Boolean(invoice?._id);

  const [customerCtx, setCustomerCtx] = useState(() => {
    if (!invoice) return null;
    const c = invoice.customerId;
    const v = invoice.vehicleId;
    if (!c?._id && !c) return null;
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

  const [services, setServices] = useState(() =>
    (invoice?.services || []).length
      ? invoice.services.map((s) => ({
          name: s.name || "",
          price: s.price || 0,
          discount: s.discount || 0,
          taxPercent: s.taxPercent || 0,
          catalogId: s.catalogId || null,
        }))
      : [emptyServiceRow()],
  );

  const [parts, setParts] = useState(() =>
    (invoice?.parts || []).length
      ? invoice.parts.map((p) => ({
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

  const [tagsInput, setTagsInput] = useState(() => (invoice?.tags || []).join(", "));
  const [discountAmount, setDiscountAmount] = useState(invoice?.discountAmount ?? 0);

  const [paymentStatus, setPaymentStatus] = useState(invoice?.paymentStatus || "unpaid");
  const [paymentMode, setPaymentMode] = useState(invoice?.paymentMode || "cash");
  const [paidAmount, setPaidAmount] = useState(invoice?.paidAmount ?? 0);

  const [notes, setNotes] = useState(invoice?.notes || "");
  const [notifyCustomer, setNotifyCustomer] = useState(Boolean(invoice?.notifyCustomer));

  const [repairOrderId, setRepairOrderId] = useState(invoice?.repairOrderId?._id || invoice?.repairOrderId || "");
  const [roQuery, setRoQuery] = useState("");
  const [roResults, setRoResults] = useState([]);
  const [roOpen, setRoOpen] = useState(false);
  const [roLoading, setRoLoading] = useState(false);
  const roTimerRef = useRef(null);
  const roWrapRef = useRef(null);

  useEffect(() => {
    if (roTimerRef.current) clearTimeout(roTimerRef.current);
    const q = roQuery.trim();
    if (q.length < 2 || !activeGarageId) {
      setRoResults([]);
      return;
    }
    setRoLoading(true);
    roTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/repair-orders", {
          params: { garageId: activeGarageId, search: q, limit: 10 },
        });
        setRoResults(res.data?.data?.orders || []);
      } catch {
        setRoResults([]);
      } finally {
        setRoLoading(false);
      }
    }, 400);
    return () => roTimerRef.current && clearTimeout(roTimerRef.current);
  }, [roQuery, activeGarageId]);

  useEffect(() => {
    if (!roOpen) return;
    const onDoc = (e) => {
      if (roWrapRef.current && !roWrapRef.current.contains(e.target)) setRoOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [roOpen]);

  const totals = useMemo(() => {
    const servicesSubTotal = services.reduce(
      (sum, r) => sum + computeServiceLineTotal(r),
      0,
    );
    const partsSubTotal = parts.reduce((sum, r) => sum + computePartLineTotal(r), 0);
    const subtotal = servicesSubTotal + partsSubTotal;
    const grandTotal = Math.max(subtotal - (Number(discountAmount) || 0), 0);
    return { servicesSubTotal, partsSubTotal, grandTotal };
  }, [services, parts, discountAmount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerCtx?.customerId) {
      alert("Pick a customer first.");
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

    const payload = {
      repairOrderId: repairOrderId || null,
      customerId: customerCtx.customerId,
      vehicleId: customerCtx.vehicleId || null,
      services: cleanServices,
      parts: cleanParts,
      tags,
      discountAmount: Number(discountAmount) || 0,
      paymentStatus,
      paymentMode,
      paidAmount: paymentStatus === "partial" ? Number(paidAmount) || 0 : undefined,
      notifyCustomer,
      notes: notes.trim() || null,
    };

    onSave(payload, { mode: isEdit ? "edit" : "create" });
  };

  const updateRow = (setter, idx, key, value) => {
    setter((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleLinkRO = async (ro) => {
    setRepairOrderId(ro._id);
    setRoOpen(false);
    setRoQuery("");
    // Pull the RO detail so we can pre-fill lines + customer.
    try {
      const res = await api.get(`/repair-orders/${ro._id}`, {
        params: { garageId: activeGarageId },
      });
      const order = res.data?.data?.order;
      if (!order) return;

      const c = order.customerId || {};
      const v = order.vehicleId || null;
      setCustomerCtx({
        customerId: c._id,
        vehicleId: v?._id || null,
        customerName: c.fullName || "",
        customerPhone: c.phoneNo || "",
        vehicleLabel: v
          ? `${v.vehicleBrand || ""} ${v.vehicleModel || ""}`.trim() +
            (v.vehicleRegisterNo ? ` (${v.vehicleRegisterNo})` : "")
          : "",
      });
      if ((order.services || []).length) {
        setServices(
          order.services.map((s) => ({
            name: s.name || "",
            price: s.price || 0,
            discount: s.discount || 0,
            taxPercent: s.taxPercent || 0,
            catalogId: s.catalogId || null,
          })),
        );
      }
      if ((order.parts || []).length) {
        setParts(
          order.parts.map((p) => ({
            name: p.name || "",
            partCode: p.partCode || "",
            quantity: p.quantity || 1,
            unitPrice: p.unitPrice || 0,
            discount: p.discount || 0,
            taxPercent: p.taxPercent || 0,
            inventoryId: p.inventoryId || null,
          })),
        );
      }
      if ((order.tags || []).length) setTagsInput(order.tags.join(", "));
    } catch (err) {
      console.error(err);
    }
  };

  const linkedROLabel = useMemo(() => {
    if (!repairOrderId) return "";
    // We don't have the orderNo cached unless prefilled — show the short id.
    if (invoice?.repairOrderId?.orderNo) return invoice.repairOrderId.orderNo;
    return String(repairOrderId).slice(-6);
  }, [repairOrderId, invoice]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div>
            <h3>{isEdit ? `Edit invoice ${invoice?.invoiceNo || ""}` : "New invoice"}</h3>
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

          {!isEdit && (
            <section className={styles.section}>
              <label className={styles.sectionLabel}>Link to repair order (optional)</label>
              <div className={styles.typeWrap} ref={roWrapRef}>
                {repairOrderId ? (
                  <div className={styles.selectedBox}>
                    <div className={styles.selectedText}>
                      <strong>Linked to RO {linkedROLabel}</strong>
                      <span>Customer and lines were prefilled from this repair order.</span>
                    </div>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setRepairOrderId("")}
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Search by order number"
                      value={roQuery}
                      onChange={(e) => {
                        setRoQuery(e.target.value);
                        setRoOpen(true);
                      }}
                      onFocus={() => setRoOpen(true)}
                    />
                    {roOpen && roQuery.trim().length >= 2 && (
                      <div className={styles.dropdown}>
                        {roLoading ? (
                          <div className={styles.dropEmpty}>Searching...</div>
                        ) : roResults.length === 0 ? (
                          <div className={styles.dropEmpty}>No matches</div>
                        ) : (
                          roResults.map((ro) => (
                            <button
                              key={ro._id}
                              type="button"
                              className={styles.dropItem}
                              onClick={() => handleLinkRO(ro)}
                            >
                              <span className={styles.dropName}>
                                {ro.orderNo || String(ro._id).slice(-6)}
                                <span className={styles.dropMeta}>
                                  {" · "}
                                  {ro.status || ""}
                                </span>
                              </span>
                              <span className={styles.dropVehicle}>
                                {ro.customerId?.fullName || "Customer"} ·{" "}
                                {ro.vehicleId?.vehicleRegisterNo || "—"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

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
                  <span className={styles.lineTotal}>
                    {money(computeServiceLineTotal(row))}
                  </span>
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

          <section className={styles.totalsSection}>
            <div className={styles.totalsGrid}>
              <div className={styles.totalsField}>
                <label>Discount ₹</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className={styles.totalsField}>
                <label>Payment status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.totalsField}>
                <label>Payment mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              {paymentStatus === "partial" && (
                <div className={styles.totalsField}>
                  <label>Paid amount ₹</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className={styles.totalsSummary}>
              <div>
                <span>Services subtotal</span>
                <strong>{money(totals.servicesSubTotal)}</strong>
              </div>
              <div>
                <span>Parts subtotal</span>
                <strong>{money(totals.partsSubTotal)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong style={{ color: "#b84538" }}>
                  -{money(Number(discountAmount) || 0)}
                </strong>
              </div>
              <div className={styles.grandTotal}>
                <span>Grand total (est.)</span>
                <strong>{money(totals.grandTotal)}</strong>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <label className={styles.sectionLabel}>Notes</label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (optional)"
            />
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
            {loading ? "Saving..." : isEdit ? "Save changes" : "Create invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
