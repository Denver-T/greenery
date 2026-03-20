"use client";

import AppShell from "@/components/AppShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const router = useRouter();
  const { user, account, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    setDisplayName(user.displayName || account?.name || "");
    setPhotoURL(user.photoURL || "");
    setEmail(user.email || account?.email || "");
    setLoading(false);
  }, [account?.email, account?.name, router, user]);

  async function onSave(event) {
    event.preventDefault();
    setError("");
    setOk("");
    setSaving(true);

    try {
      if (!auth.currentUser) {
        setError("You are not signed in.");
        return;
      }

      await updateProfile(auth.currentUser, {
        displayName: displayName || null,
        photoURL: photoURL || null,
      });

      setOk("Profile updated.");
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Profile">
      <section className="app-panel shadow-soft mx-auto max-w-3xl p-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl bg-brand-soft text-2xl font-black text-brand-700">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              (displayName?.[0] || email?.[0] || "U").toUpperCase()
            )}
          </div>
          <div>
            <div className="app-badge mb-2">Account</div>
            <h1 className="app-title text-2xl">Profile settings</h1>
            <p className="app-copy mt-1 text-sm">
              Update the Firebase display name and avatar used by the shared workspace.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <form onSubmit={onSave} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Display name</span>
              <input
                className="app-field focus:app-field-focus"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Email</span>
              <input className="app-field" value={email} readOnly />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Photo URL</span>
              <input
                className="app-field focus:app-field-focus"
                value={photoURL}
                onChange={(event) => setPhotoURL(event.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <span className="text-xs text-muted">Paste a direct image URL.</span>
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
                {error}
              </div>
            ) : null}
            {ok ? (
              <div className="rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-medium text-brand-700">
                {ok}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="app-button app-button-secondary"
              >
                Back to dashboard
              </button>

              <button
                type="button"
                onClick={logout}
                className="app-button ml-auto border border-red-300/50 bg-red-100/70 text-red-700 hover:bg-red-200/80 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              >
                Sign out
              </button>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  );
}
