import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import RoleGate from "./RoleGate";
import GarageSelector from "./GarageSelector";
import styles from "./Layout.module.css";
import { clearAdminSession } from "../utils/session";

function SvgIcon({ d, ...props }) {
  return (
    <svg
      className={styles.navIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {Array.isArray(d) ? (
        d.map((p, i) => <path key={i} d={p} />)
      ) : (
        <path d={d} />
      )}
    </svg>
  );
}

const NAV = [
  {
    section: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: ["M3 12l9-9 9 9", "M9 21V12h6v9"] },
      {
        to: "/analytics",
        label: "Analytics",
        icon: ["M18 20V10", "M12 20V4", "M6 20v-6"],
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        to: "/franchises",
        label: "Franchises",
        icon: [
          "M12 2L2 7l10 5 10-5-10-5z",
          "M2 17l10 5 10-5",
          "M2 12l10 5 10-5",
        ],
      },
      {
        to: "/garages",
        label: "Garages",
        icon: [
          "M5 14l1.5-4.5A2 2 0 018.4 8h7.2a2 2 0 011.9 1.5L19 14",
          "M4 14h16v4H4z",
          "M7 18h.01",
          "M17 18h.01",
        ],
      },
      {
        to: "/repair-orders",
        label: "Repair Orders",
        icon: [
          "M14.7 6.3a4 4 0 11-5.66 5.66l-4 4 1.41 1.41 4-4a4 4 0 005.66-5.66l-1.41 1.41z",
          "M9 9l6 6",
        ],
      },
      {
        to: "/invoices",
        label: "Invoices",
        icon: [
          "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
          "M14 2v6h6",
          "M9 14h6",
          "M9 18h4",
        ],
      },
      {
        to: "/users",
        label: "Users",
        icon: [
          "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2",
          "M9 7a4 4 0 100-8 4 4 0 000 8",
          "M23 21v-2a4 4 0 00-3-3.87",
          "M16 3.13a4 4 0 010 7.75",
        ],
      },
    ],
  },
  {
    section: "Finance",
    items: [
      {
        to: "/tally-export",
        label: "Tally Export",
        icon: [
          "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
          "M14 2v6h6",
          "M8 13h8",
          "M8 17h8",
        ],
      },
    ],
  },
];

export default function Layout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAdminSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandMark}>
            <span className={styles.brandLetter}>AG</span>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Aapno Garage</span>
            <span className={styles.brandSub}>Admin Console</span>
          </div>
        </div>

        {NAV.map((section) => (
          <div key={section.section} className={styles.navSection}>
            <div className={styles.navLabel}>{section.section}</div>
            {section.items.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                >
                  <SvgIcon d={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className={styles.sidebarFooter}>
          <button className={styles.navItem} onClick={handleLogout}>
            <SvgIcon
              d={["M15 16l4-4-4-4", "M9 12h10", "M4 4h7v4", "M4 20h7v-4"]}
            />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <h1 className={styles.pageTitle}>{title || "Dashboard"}</h1>
        </div>
        <div className={styles.topbarRight}>
          <GarageSelector />
          <div className={styles.topbarPill}>
            <span className={styles.liveDot} />
            <span>Live</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg
              className={styles.logoutIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 16l4-4-4-4" />
              <path d="M9 12h10" />
              <path d="M4 4h7v4" />
              <path d="M4 20h7v-4" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </div>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
