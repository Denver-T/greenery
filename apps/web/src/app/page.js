"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Firebase placeholder:
 * Later you’ll replace mockLogin() with Firebase signInWithEmailAndPassword()
 * and optionally Google sign-in.
 *
 * Example later:
 *   import { signInWithEmailAndPassword } from "firebase/auth";
 *   import { auth } from "@/lib/firebase";
 */

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function mockLogin() {
    // Replace this with Firebase later.
    // For now, this just simulates login and routes to your dashboard.
    await new Promise((r) => setTimeout(r, 600));

    // Simple validation so it feels real
    if (!email.includes("@") || password.length < 4) {
      throw new Error("Please enter a valid email and password.");
    }

    // Optional: simple role routing later
    // router.push("/dashboard");
    router.push("apps\web\src\app\dashboard\page.js");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await mockLogin();
    } catch (err) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOverlay} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <span style={styles.logoLeaf}>🌿</span>
          </div>
          <div>
            <h1 style={styles.title}>Greenery Portal</h1>
            <p style={styles.subtitle}>Sign in to access your dashboard</p>
          </div>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <div style={styles.row}>
            <label style={styles.checkboxWrap}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span style={styles.checkboxText}>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() =>
                alert("Hook this to Firebase password reset later")
              }
              style={styles.linkBtn}
            >
              Forgot password?
            </button>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* skip logging and go to dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            style={styles.secondaryBtn}
          >
            Skip Login and Go to Dashboard
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>Firebase Auth Placeholder</span>
            <span style={styles.dividerLine} />
          </div>

          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() =>
              alert(
                "Later: connect Firebase Google Sign-In here.\nFor now this is just a placeholder.",
              )
            }
          >
            Continue with Google (later)
          </button>

          <p style={styles.footerText}>
            Don’t have access? Contact your administrator.
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    backgroundImage:
      "linear-gradient(135deg, rgba(52, 87, 33, 0.9), rgba(123, 155, 77, 0.9))",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08), transparent 40%), radial-gradient(circle at 40% 80%, rgba(0,0,0,0.12), transparent 50%)",
    pointerEvents: "none",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: "18px",
    padding: "26px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.6)",
    position: "relative",
    backdropFilter: "blur(8px)",
  },
  header: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    marginBottom: "18px",
  },
  logoCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2f5f1f, #7fa24a)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 10px 24px rgba(47,95,31,0.25)",
  },
  logoLeaf: { fontSize: "22px" },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#214617",
    letterSpacing: "0.2px",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "rgba(33,70,23,0.72)",
  },
  form: { display: "grid", gap: "12px" },
  label: {
    display: "grid",
    gap: "8px",
    fontSize: "13px",
    color: "#214617",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(33,70,23,0.18)",
    outline: "none",
    background: "rgba(255,255,255,0.9)",
    fontSize: "14px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  checkboxWrap: { display: "flex", alignItems: "center", gap: "8px" },
  checkboxText: { fontSize: "13px", color: "rgba(33,70,23,0.75)" },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#2f5f1f",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  error: {
    background: "rgba(178, 34, 34, 0.10)",
    border: "1px solid rgba(178, 34, 34, 0.25)",
    color: "firebrick",
    padding: "10px 12px",
    borderRadius: "12px",
    fontSize: "13px",
  },
  primaryBtn: {
    marginTop: "4px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "white",
    background: "linear-gradient(135deg, #2f5f1f, #7fa24a)",
    boxShadow: "0 12px 30px rgba(47,95,31,0.25)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "10px 0 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(33,70,23,0.15)",
  },
  dividerText: {
    fontSize: "12px",
    color: "rgba(33,70,23,0.55)",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(33,70,23,0.22)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontWeight: 800,
    color: "#214617",
  },
  footerText: {
    margin: "6px 0 0",
    fontSize: "12px",
    color: "rgba(33,70,23,0.55)",
    textAlign: "center",
  },
};
