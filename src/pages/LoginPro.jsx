import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import styles from "./LoginPro.module.css";
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
    if (hasActiveAdminSession()) {
      navigate("/", { replace: true });
    }
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
      <div className={styles.pageGlow} aria-hidden="true" />

      <div className={styles.shell}>
        <section className={styles.storyPanel}>
          <span className={styles.storyEyebrow}>
            Garage operations control room
          </span>

          <div className={styles.brandRow}>
            <BrandMark />
            <div>
              <h1 className={styles.brandTitle}>Aapno Garage</h1>
              <p className={styles.brandSub}>Admin Panel</p>
            </div>
          </div>

          <h2 className={styles.heroTitle}>
            Keep onboarding sharp, fast, and under control.
          </h2>
          <p className={styles.heroCopy}>
            Review garage registrations, approve trusted partners, and maintain
            clean records from one polished workspace.
          </p>

          <div className={styles.storyCard}>
            <span className={styles.storyCardLabel}>
              What this panel is built for
            </span>
            <div className={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <FeatureItem key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formIntro}>
            <span className={styles.formEyebrow}>Secure access</span>
            <h3 className={styles.formTitle}>Sign in to continue</h3>
            <p className={styles.formText}>
              Use your admin credentials to manage approvals, edits, and
              platform quality.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className={styles.input}
                type="text"
                placeholder="Enter your admin username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.btn} type="submit" disabled={loading}>
              <span>{loading ? "Signing in..." : "Sign In"}</span>
              <LoginIcon name="arrow" className={styles.buttonIcon} />
            </button>
          </form>

          <p className={styles.footerNote}>
            If the API is unreachable, start the backend service on port 4000
            before signing in.
          </p>
        </section>
      </div>
    </div>
  );
}
