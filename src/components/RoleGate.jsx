import React from "react";
import { getAdminToken, hasActiveAdminSession } from "../utils/session";

// Lightweight RBAC gate for the admin panel UI.
//
//   <RoleGate allow={["superAdmin"]}><DangerButton/></RoleGate>
//   <RoleGate allow={["superAdmin","franchiseAdmin"]} fallback={<Locked/>}>
//     <PaymentSettings/>
//   </RoleGate>
//
// The current admin token is the platform "superadmin" today; this component
// is forward-compatible with finer-grained roles once the backend issues
// real role claims.

function getCurrentRole() {
  // Token claim if present; else infer from localStorage.
  try {
    if (!hasActiveAdminSession()) return null;
    const token = getAdminToken();
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role || null;
  } catch {
    return null;
  }
}

// Treat the legacy "superadmin" claim as the new "superAdmin" for UI purposes.
const NORMALISE = { superadmin: "superAdmin" };

export default function RoleGate({ allow = [], fallback = null, children }) {
  const raw = getCurrentRole();
  const role = NORMALISE[raw] || raw;
  if (!role) return fallback;
  if (allow.length === 0) return children;
  return allow.includes(role) ? children : fallback;
}

export { getCurrentRole };
