import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/LoginPro";
import Dashboard from "./pages/DashboardNew";
import FranchiseManagement from "./pages/FranchiseManagementPro";
import FranchiseDetail from "./pages/FranchiseDetail";
import GarageManagement from "./pages/GarageManagement";
import Analytics from "./pages/AnalyticsPro";
import TallyExport from "./pages/TallyExport";
import UserManagement from "./pages/UserManagement";
import InvoiceManagement from "./pages/InvoiceManagement";
import RepairOrderManagement from "./pages/RepairOrderManagement";
import { ActiveGarageProvider } from "./context/ActiveGarageContext";
import {
  clearAdminSession,
  getAdminTokenExpiry,
  hasActiveAdminSession,
  isAdminSessionExpired,
  parseAdminSessionExpiry,
} from "./utils/session";

function PrivateRoute({ children }) {
  return hasActiveAdminSession() ? children : <Navigate to="/login" replace />;
}

function P({ children }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}

function AdminSessionBoundary() {
  const location = useLocation();

  useEffect(() => {
    const expiresAt = getAdminTokenExpiry();

    if (!expiresAt) {
      return undefined;
    }

    if (isAdminSessionExpired(expiresAt)) {
      clearAdminSession();
      if (location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearAdminSession();
      window.location.replace("/login");
    }, Math.max(0, parseAdminSessionExpiry(expiresAt) - Date.now()));

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <ActiveGarageProvider>
      <AdminSessionBoundary />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<P><Dashboard /></P>} />
        <Route path="/franchises" element={<P><FranchiseManagement /></P>} />
        <Route path="/franchises/:id" element={<P><FranchiseDetail /></P>} />
        <Route path="/garages" element={<P><GarageManagement /></P>} />
        <Route path="/repair-orders" element={<P><RepairOrderManagement /></P>} />
        <Route path="/invoices" element={<P><InvoiceManagement /></P>} />
        <Route path="/analytics" element={<P><Analytics /></P>} />
        <Route path="/tally-export" element={<P><TallyExport /></P>} />
        <Route path="/users" element={<P><UserManagement /></P>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ActiveGarageProvider>
  );
}
