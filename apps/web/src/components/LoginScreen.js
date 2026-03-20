"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

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

export default function LoginScreen() {
  const router = useRouter();
  const { error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function withPersistence(fn) {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    return fn();
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await withPersistence(() =>
        signInWithEmailAndPassword(auth, email.trim(), password)
      );
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
      await withPersistence(() => signInWithPopup(auth, provider));
      router.push("/dashboard");
    } catch (err) {
      setError(translateFirebaseError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert("If that email exists, a reset link has been sent.");
    } catch (err) {
      setError(translateFirebaseError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(145,188,93,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(79,108,45,0.2),transparent_30%)]" />

      <section className="app-surface shadow-elevated relative w-full max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(145deg,rgba(79,108,45,0.96),rgba(106,143,65,0.92))] px-8 py-10 text-white md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(9,14,10,0.2),transparent_34%)]" />
            <div className="relative">
              <div className="app-badge mb-6 bg-white/16 text-white">Employee Access</div>
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/18 text-2xl shadow-elevated">
                  G
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                    Greenery Portal
                  </h1>
                  <p className="mt-1 text-sm text-white/80">
                    Task, employee, and work-request management in one place.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 text-sm text-white/88">
                <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                  Sign in with an approved Firebase account linked to an active employee record.
                </div>
                <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                  Admin, manager, and employee access levels are enforced from the database.
                </div>
                <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                  REQ forms, assignments, and task views stay protected behind the same login.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-strong px-8 py-10 md:px-10 md:py-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                  Secure Sign In
                </p>
                <h2 className="app-title mt-3 text-3xl">Welcome back</h2>
                <p className="app-copy mt-2 text-sm">
                  Use the team account assigned in Firebase Authentication.
                </p>
              </div>

              <form onSubmit={onSubmit} className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Email
                  <input
                    className="app-field focus:app-field-focus"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Password
                  <input
                    className="app-field focus:app-field-focus"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="font-semibold text-brand-700 hover:text-brand"
                  >
                    Forgot password?
                  </button>
                </div>

                {error || authError ? (
                  <div className="rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
                    {error || authError}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                disabled={loading}
                onClick={onGoogle}
                className="app-button app-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
              >
                Continue with Google
              </button>

              <p className="app-copy mt-6 text-center text-sm">
                Need access? Contact an administrator to be added to the employee database.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
