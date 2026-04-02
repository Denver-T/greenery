"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  function translateFirebaseError(code) {
    switch (code) {
      case "auth/invalid-email":
        return "That email address looks invalid.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with that email.";
      case "auth/wrong-password":
        return "Incorrect password. Try again.";
      case "auth/popup-blocked":
        return "Popup was blocked. Allow popups and try again.";
      case "auth/popup-closed-by-user":
        return "Popup closed before completing sign in.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait and try again.";
      default:
        return "Login failed. Please try again.";
    }
  }

  async function withPersistence(fn) {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    );
    return fn();
  }

  async function onSubmit(e) {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const credential = await withPersistence(() =>
      signInWithEmailAndPassword(auth, email.trim(), password)
    );

    const token = await credential.user.getIdToken(true);
    localStorage.setItem("token", token);

    router.push("/dashboard");
  } catch (err) {
    setError(translateFirebaseError(err?.code));
  } finally {
    setLoading(false);
  }
}

  async function onGoogle() {
  setError("");
  setLoading(true);

  try {
    const provider = new GoogleAuthProvider();
    const credential = await withPersistence(() =>
      signInWithPopup(auth, provider)
    );

    const token = await credential.user.getIdToken(true);
    localStorage.setItem("token", token);

    router.push("/dashboard");
  } catch (err) {
    setError(translateFirebaseError(err?.code));
  } finally {
    setLoading(false);
  }
}

  async function onForgotPassword() {
    if (!email) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }
    setError("");
    setResetSent(false);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setError(translateFirebaseError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOverlay} />
      <div style={styles.bgShapeA} />
      <div style={styles.bgShapeB} />
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.logoCircle}>
            <span style={styles.logoLeaf}>🌿</span>
          </div>
          <div>
            <p style={styles.eyebrow}>Greenery Operations</p>
            <h2 style={styles.title}>Greenery Portal</h2>
            <p style={styles.subtitle}>Sign in to access your dashboard</p>
          </div>
        </header>

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
              onClick={onForgotPassword}
              style={styles.linkBtn}
            >
              Forgot password?
            </button>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}
          {resetSent ? <p style={{ color: "var(--brand-700)", marginTop: 8, fontSize: 14 }}>If that email exists, a reset link has been sent.</p> : null}

          <button
            disabled={loading}
            className="primary"
            style={styles.primaryBtn}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <button
          disabled={loading}
          onClick={onGoogle}
          style={styles.secondaryBtn}
        >
          Continue with Google
        </button>

        <p style={styles.footerText}>
          Don’t have access? Contact your administrator.
        </p>
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
      "linear-gradient(145deg, #1f3427 0%, #294733 42%, #5f7d4b 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: 'var(--font-sans)',
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 70% 30%, rgba(201,139,69,0.16), transparent 36%), radial-gradient(circle at 40% 80%, rgba(0,0,0,0.12), transparent 50%)",
    pointerEvents: "none",
  },
  bgShapeA: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "999px",
    background: "rgba(244, 241, 232, 0.08)",
    top: "-140px",
    right: "-90px",
    filter: "blur(10px)",
  },
  bgShapeB: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: "999px",
    background: "rgba(201, 139, 69, 0.12)",
    bottom: "-100px",
    left: "-40px",
    filter: "blur(6px)",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "rgba(255, 253, 247, 0.94)",
    borderRadius: "24px",
    padding: "30px",
    boxShadow: "0 24px 70px rgba(18, 33, 23, 0.28)",
    border: "1px solid rgba(255,255,255,0.6)",
    position: "relative",
    backdropFilter: "blur(10px)",
  },
  header: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    marginBottom: "18px",
  },
  logoCircle: {
    width: "54px",
    height: "54px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #294733, #5f7d4b)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 30px rgba(41,71,51,0.28)",
  },
  logoLeaf: { fontSize: "22px" },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#617060",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    color: "#223126",
    letterSpacing: "0.2px",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "rgba(34,49,38,0.72)",
  },
  form: { display: "grid", gap: "12px" },
  label: {
    display: "grid",
    gap: "8px",
    fontSize: "13px",
    color: "#223126",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(95,125,75,0.18)",
    outline: "none",
    background: "#f4f1e8",
    fontSize: "14px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  checkboxWrap: { display: "flex", alignItems: "center", gap: "8px" },
  checkboxText: { fontSize: "13px", color: "rgba(34,49,38,0.75)" },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#5f7d4b",
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
    background: "linear-gradient(135deg, #294733, #5f7d4b)",
    boxShadow: "0 16px 34px rgba(41,71,51,0.22)",
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
    background: "rgba(95,125,75,0.18)",
  },
  dividerText: {
    fontSize: "12px",
    color: "rgba(34,49,38,0.55)",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(95,125,75,0.22)",
    background: "rgba(255,253,247,0.9)",
    cursor: "pointer",
    fontWeight: 800,
    color: "#223126",
  },
  footerText: {
    margin: "6px 0 0",
    fontSize: "12px",
    color: "rgba(34,49,38,0.55)",
    textAlign: "center",
  },
};
