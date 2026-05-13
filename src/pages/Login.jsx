import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import styles from "./Login.module.css";
import { hasActiveAdminSession, saveAdminSession } from "../utils/session";

const FEATURE_ITEMS = [
  {
    icon: "shield",
    title: "Protected admin access",
    text: "Keep approvals, edits, and partner decisions behind a focused sign-in flow.",
  },
  {
    icon: "pulse",
    title: "Fast review cycle",
    text: "Move from pending garages to approved partners without jumping between tools.",
  },
  {
    icon: "layers",
    title: "One clean workspace",
    text: "Manage partner records, brand details, and status updates from a single panel.",
  },
];

function LoginIcon({ name, className }) {
  const iconProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "shield":
      return (
        <svg {...iconProps}>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
          <path d="M9.5 12.25l1.75 1.75L15 10.25" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...iconProps}>
          <path d="M3 12h4l2-4 3 8 2-4h7" />
        </svg>
      );
    case "layers":
      return (
        <svg {...iconProps}>
          <path d="M12 4l8 4-8 4-8-4 8-4z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 16l8 4 8-4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...iconProps}>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <div className={styles.brandMark} aria-hidden="true">
      <div className={styles.brandRing}>
        <div className={styles.brandCore}>
          <span className={styles.brandLetter}>AG</span>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, text }) {
  return (
    <div className={styles.featureItem}>
      <div className={styles.featureIconWrap}>
        <LoginIcon name={icon} className={styles.featureIcon} />
      </div>
      <div>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureText}>{text}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasActiveAdminSession()) navigate("/", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", form);
      saveAdminSession({
        token: res.data.data.token,
        expiresAt: res.data.data.tokenExpiresAt,
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (!err.response) {
        setError(
          "Cannot connect to server. Make sure the backend is running on port 4000.",
        );
      } else {
        setError(err.response.data?.message || "Invalid credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔧</span>
          <h1 className={styles.logoText}>Aapno Garage</h1>
          <p className={styles.logoSub}>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
