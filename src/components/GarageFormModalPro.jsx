import React, { useState, useEffect } from "react";
import styles from "./GarageFormModalPro.module.css";

const GARAGE_TYPES = [
  { value: "twoWheeler", label: "2-Wheeler" },
  { value: "fourWheeler", label: "4-Wheeler" },
  { value: "both", label: "Both (2 and 4 Wheeler)" },
];

const APPROVAL_STATUSES = [
  {
    value: "approved",
    label: "Approved",
    description: "Garage is active and visible on the platform.",
    tone: "optionApproved",
  },
  {
    value: "pending",
    label: "Pending",
    description: "Garage stays in the review queue for admin action.",
    tone: "optionPending",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Garage is blocked until the record is corrected.",
    tone: "optionRejected",
  },
];

const EMPTY = {
  fullName: "",
  phoneNo: "",
  emailId: "",
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
  setAsDefault: false,
};

function toFormState(garage, parentOwner) {
  // addBranch mode: a parentOwner is supplied. Pre-fill owner fields from them
  // so the admin only fills in branch-specific data.
  if (parentOwner) {
    return {
      ...EMPTY,
      fullName: parentOwner.fullName || "",
      phoneNo: parentOwner.phoneNo || "",
      emailId: parentOwner.emailId || "",
      state: parentOwner.state || "",
      garageOwnerName: parentOwner.fullName || "",
    };
  }
  if (!garage) {
    return EMPTY;
  }

  const owner = garage.owner || {};

  return {
    fullName: owner.fullName || "",
    phoneNo: owner.phoneNo || "",
    emailId: owner.emailId || "",
    garageName: garage.garageName || "",
    garageOwnerName: garage.garageOwnerName || "",
    garageAddress: garage.garageAddress || "",
    garageContactNumber: garage.garageContactNumber || "",
    garageType: garage.garageType || "twoWheeler",
    garageLogo: garage.garageLogo || "",
    state: garage.state || "",
    isGstApplicable: !!garage.isGstApplicable,
    gstNumber: garage.gstNumber || "",
    approvalStatus: garage.approvalStatus || "approved",
    setAsDefault: !!garage.isPrimaryBranch,
  };
}

function ModalIcon() {
  return (
    <svg
      className={styles.modalIcon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 14l1.5-4.5A2 2 0 018.4 8h7.2a2 2 0 011.9 1.5L19 14" />
      <path d="M4 14h16v4H4z" />
      <path d="M7 18h.01" />
      <path d="M17 18h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className={styles.closeIcon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function SectionBlock({ eyebrow, title, text, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>{eyebrow}</span>
          <h3 className={styles.sectionTitle}>{title}</h3>
          <p className={styles.sectionText}>{text}</p>
        </div>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export default function GarageFormModal({
  garage,
  parentOwner, // when provided → "Add Branch" mode
  mode, // optional explicit mode: "create" | "edit" | "addBranch"
  franchiseId, // when provided, the garage is created under this franchise
  onSave,
  onClose,
  loading,
}) {
  const resolvedMode =
    mode || (parentOwner ? "addBranch" : garage ? "edit" : "create");
  const isEdit = resolvedMode === "edit";
  const isAddBranch = resolvedMode === "addBranch";
  const isCreate = resolvedMode === "create";

  const [form, setForm] = useState(() => toFormState(garage, parentOwner));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(toFormState(garage, parentOwner));
    setErrors({});
  }, [garage, parentOwner]);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.phoneNo.trim()) nextErrors.phoneNo = "Required";
    if (!form.garageName.trim()) nextErrors.garageName = "Required";
    if (!form.garageOwnerName.trim()) nextErrors.garageOwnerName = "Required";
    if (!form.garageAddress.trim()) nextErrors.garageAddress = "Required";
    if (!form.garageContactNumber.trim()) nextErrors.garageContactNumber = "Required";
    if (!form.garageType) nextErrors.garageType = "Required";
    if (form.isGstApplicable && !form.gstNumber.trim()) {
      nextErrors.gstNumber = "GST number required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = { ...form };

    if (!payload.emailId) delete payload.emailId;
    if (!payload.garageLogo) delete payload.garageLogo;
    if (!payload.gstNumber || !payload.isGstApplicable) {
      payload.gstNumber = "";
    }

    // For Add Branch: tell the API to attach to the existing owner.
    if (isAddBranch && parentOwner?._id) {
      payload.ownerId = parentOwner._id;
    }

    if (franchiseId) {
      payload.franchiseId = franchiseId;
    }

    onSave(payload, { mode: resolvedMode });
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIdentity}>
            <div className={styles.iconShell}>
              <ModalIcon />
            </div>
            <div>
              <span className={styles.headerEyebrow}>
                {franchiseId ? "Franchise branch setup" : "Partner setup"}
              </span>
              <h2 className={styles.title}>
                {isEdit
                  ? "Edit garage profile"
                  : isAddBranch
                    ? `Add a branch for ${parentOwner?.fullName || parentOwner?.phoneNo || "this owner"}`
                    : franchiseId
                      ? "Add franchise branch"
                      : "Create a garage profile"}
              </h2>
              <p className={styles.subtitle}>
                {isAddBranch
                  ? "The owner is locked. Fill in the new branch details only."
                  : franchiseId
                    ? "This garage will be linked to the franchise automatically."
                    : "Update owner access, garage identity, and review status from one place."}
              </p>
            </div>
          </div>

          <button className={styles.closeBtn} onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <SectionBlock
            eyebrow="Owner account"
            title="Primary account details"
            text="These details control the owner identity attached to the garage record."
          >
            <div className={styles.row}>
              <Field label="Owner full name" error={errors.fullName}>
                <input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Ramesh Kumar"
                  disabled={isAddBranch}
                  className={isAddBranch ? styles.disabled : ""}
                />
              </Field>

              <Field
                label="Phone number *"
                error={errors.phoneNo}
                hint={
                  isEdit
                    ? "Phone number stays locked after account creation."
                    : isAddBranch
                      ? "Owner phone is reused from the parent garage."
                      : ""
                }
              >
                <input
                  value={form.phoneNo}
                  onChange={(e) => set("phoneNo", e.target.value)}
                  placeholder="9876543210"
                  disabled={isEdit || isAddBranch}
                  className={isEdit || isAddBranch ? styles.disabled : ""}
                />
              </Field>
            </div>

            <div className={styles.row}>
              <Field label="Email ID" error={errors.emailId}>
                <input
                  value={form.emailId}
                  onChange={(e) => set("emailId", e.target.value)}
                  placeholder="owner@gmail.com"
                  type="email"
                  disabled={isAddBranch}
                  className={isAddBranch ? styles.disabled : ""}
                />
              </Field>

              <Field label="State" error={errors.state}>
                <input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="Maharashtra"
                />
              </Field>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Garage details"
            title="Business identity"
            text="Add the visible brand details that admins and teams will work with."
          >
            <div className={styles.row}>
              <Field label="Garage name *" error={errors.garageName}>
                <input
                  value={form.garageName}
                  onChange={(e) => set("garageName", e.target.value)}
                  placeholder="Speed Motors"
                />
              </Field>

              <Field label="Owner name on garage *" error={errors.garageOwnerName}>
                <input
                  value={form.garageOwnerName}
                  onChange={(e) => set("garageOwnerName", e.target.value)}
                  placeholder="Ramesh Kumar"
                />
              </Field>
            </div>

            <div className={styles.row}>
              <Field label="Contact number *" error={errors.garageContactNumber}>
                <input
                  value={form.garageContactNumber}
                  onChange={(e) => set("garageContactNumber", e.target.value)}
                  placeholder="9876543210"
                />
              </Field>

              <Field label="Garage type *" error={errors.garageType}>
                <select
                  value={form.garageType}
                  onChange={(e) => set("garageType", e.target.value)}
                >
                  {GARAGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Address *" error={errors.garageAddress}>
              <textarea
                value={form.garageAddress}
                onChange={(e) => set("garageAddress", e.target.value)}
                placeholder="123, MG Road, Pune"
                rows="3"
              />
            </Field>

            <Field label="Garage logo URL" error={errors.garageLogo}>
              <input
                value={form.garageLogo}
                onChange={(e) => set("garageLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </Field>

            <div className={styles.toggleRow}>
              <label className={styles.toggleCard} htmlFor="gst">
                <div>
                  <span className={styles.toggleTitle}>GST applicable</span>
                  <p className={styles.toggleText}>
                    Turn this on if the garage should store a GST number.
                  </p>
                </div>
                <input
                  id="gst"
                  type="checkbox"
                  checked={form.isGstApplicable}
                  onChange={(e) => set("isGstApplicable", e.target.checked)}
                />
              </label>

              {!isEdit && (
                <label className={styles.toggleCard} htmlFor="setAsDefault">
                  <div>
                    <span className={styles.toggleTitle}>Set as default branch</span>
                    <p className={styles.toggleText}>
                      Make this the owner&apos;s active garage. Existing default
                      will be unset.
                    </p>
                  </div>
                  <input
                    id="setAsDefault"
                    type="checkbox"
                    checked={form.setAsDefault}
                    onChange={(e) => set("setAsDefault", e.target.checked)}
                  />
                </label>
              )}
            </div>

            {form.isGstApplicable && (
              <Field label="GST number *" error={errors.gstNumber}>
                <input
                  value={form.gstNumber}
                  onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </Field>
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Access control"
            title="Review status"
            text="Choose the current approval state for this garage record."
          >
            <div className={styles.statusGrid}>
              {APPROVAL_STATUSES.map((status) => (
                <label
                  key={status.value}
                  className={`${styles.statusOption} ${styles[status.tone]} ${
                    form.approvalStatus === status.value ? styles.statusSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="approvalStatus"
                    value={status.value}
                    checked={form.approvalStatus === status.value}
                    onChange={() => set("approvalStatus", status.value)}
                  />
                  <span className={styles.statusOptionTitle}>{status.label}</span>
                  <span className={styles.statusOptionText}>{status.description}</span>
                </label>
              ))}
            </div>
          </SectionBlock>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : isAddBranch
                    ? "Add branch"
                    : "Create garage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  const childClassName = `${styles.input} ${error ? styles.inputError : ""} ${
    children.props.className || ""
  }`;

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <label className={styles.label}>{label}</label>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      {React.cloneElement(children, { className: childClassName })}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}
