import React, { useState, useEffect } from "react";
import styles from "./GarageFormModal.module.css";

const GARAGE_TYPES = [
  { value: "twoWheeler",  label: "2-Wheeler" },
  { value: "fourWheeler", label: "4-Wheeler" },
  { value: "both",        label: "Both (2 & 4 Wheeler)" },
];

const APPROVAL_STATUSES = [
  { value: "approved", label: "Approved" },
  { value: "pending",  label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY = {
  // owner
  fullName: "",
  phoneNo: "",
  emailId: "",
  // garage
  garageName: "",
  garageOwnerName: "",
  garageAddress: "",
  garageContactNumber: "",
  garageType: "twoWheeler",
  garageLogo: "",
  state: "",
  isGstApplicable: false,
  gstNumber: "",
  approvalStatus: "approved",
};

function field(garage) {
  if (!garage) return EMPTY;
  const o = garage.owner || {};
  return {
    fullName:             o.fullName             || "",
    phoneNo:              o.phoneNo              || "",
    emailId:              o.emailId              || "",
    garageName:           garage.garageName      || "",
    garageOwnerName:      garage.garageOwnerName || "",
    garageAddress:        garage.garageAddress   || "",
    garageContactNumber:  garage.garageContactNumber || "",
    garageType:           garage.garageType      || "twoWheeler",
    garageLogo:           garage.garageLogo      || "",
    state:                garage.state           || "",
    isGstApplicable:      !!garage.isGstApplicable,
    gstNumber:            garage.gstNumber       || "",
    approvalStatus:       garage.approvalStatus  || "approved",
  };
}

export default function GarageFormModal({ garage, onSave, onClose, loading }) {
  const isEdit = !!garage;
  const [form, setForm] = useState(() => field(garage));
  const [errors, setErrors] = useState({});

  // Reset form when garage prop changes
  useEffect(() => { setForm(field(garage)); setErrors({}); }, [garage]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.phoneNo.trim())           e.phoneNo           = "Required";
    if (!form.garageName.trim())        e.garageName        = "Required";
    if (!form.garageOwnerName.trim())   e.garageOwnerName   = "Required";
    if (!form.garageAddress.trim())     e.garageAddress     = "Required";
    if (!form.garageContactNumber.trim()) e.garageContactNumber = "Required";
    if (!form.garageType)               e.garageType        = "Required";
    if (form.isGstApplicable && !form.gstNumber.trim()) e.gstNumber = "GST number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.emailId) delete payload.emailId;
    if (!payload.garageLogo) delete payload.garageLogo;
    if (!payload.gstNumber || !payload.isGstApplicable) payload.gstNumber = "";
    onSave(payload);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isEdit ? "Edit Garage" : "Add New Garage"}</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>

          {/* ── Owner section ── */}
          <p className={styles.sectionLabel}>Owner / Account</p>
          <div className={styles.row}>
            <Field label="Owner Full Name" error={errors.fullName}>
              <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ramesh Kumar" />
            </Field>
            <Field label="Phone Number *" error={errors.phoneNo}>
              <input
                value={form.phoneNo}
                onChange={(e) => set("phoneNo", e.target.value)}
                placeholder="9876543210"
                disabled={isEdit}
                className={isEdit ? styles.disabled : ""}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Email ID" error={errors.emailId}>
              <input value={form.emailId} onChange={(e) => set("emailId", e.target.value)} placeholder="owner@gmail.com" type="email" />
            </Field>
            <Field label="State" error={errors.state}>
              <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra" />
            </Field>
          </div>

          {/* ── Garage section ── */}
          <p className={styles.sectionLabel}>Garage Details</p>
          <div className={styles.row}>
            <Field label="Garage Name *" error={errors.garageName}>
              <input value={form.garageName} onChange={(e) => set("garageName", e.target.value)} placeholder="Speed Motors" />
            </Field>
            <Field label="Owner Name (on garage) *" error={errors.garageOwnerName}>
              <input value={form.garageOwnerName} onChange={(e) => set("garageOwnerName", e.target.value)} placeholder="Ramesh Kumar" />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Contact Number *" error={errors.garageContactNumber}>
              <input value={form.garageContactNumber} onChange={(e) => set("garageContactNumber", e.target.value)} placeholder="9876543210" />
            </Field>
            <Field label="Garage Type *" error={errors.garageType}>
              <select value={form.garageType} onChange={(e) => set("garageType", e.target.value)}>
                {GARAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Address *" error={errors.garageAddress}>
            <input value={form.garageAddress} onChange={(e) => set("garageAddress", e.target.value)} placeholder="123, MG Road, Pune" />
          </Field>
          <Field label="Garage Logo URL" error={errors.garageLogo}>
            <input value={form.garageLogo} onChange={(e) => set("garageLogo", e.target.value)} placeholder="https://..." />
          </Field>

          {/* ── GST ── */}
          <div className={styles.checkRow}>
            <input
              id="gst"
              type="checkbox"
              checked={form.isGstApplicable}
              onChange={(e) => set("isGstApplicable", e.target.checked)}
            />
            <label htmlFor="gst">GST Applicable</label>
          </div>
          {form.isGstApplicable && (
            <Field label="GST Number *" error={errors.gstNumber}>
              <input
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </Field>
          )}

          {/* ── Approval status ── */}
          <p className={styles.sectionLabel}>Access Control</p>
          <div className={styles.statusRow}>
            {APPROVAL_STATUSES.map((s) => (
              <label key={s.value} className={`${styles.statusChip} ${form.approvalStatus === s.value ? styles[s.value] : ""}`}>
                <input
                  type="radio"
                  name="approvalStatus"
                  value={s.value}
                  checked={form.approvalStatus === s.value}
                  onChange={() => set("approvalStatus", s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Garage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {React.cloneElement(children, { className: `${styles.input} ${error ? styles.inputError : ""} ${children.props.className || ""}` })}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}
