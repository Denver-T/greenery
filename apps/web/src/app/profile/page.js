"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebaseClient";
import {
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [email, setEmail] = useState("");

  // Load current user and guard the route
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/"); // not signed in; bounce to login
        return;
      }
      setDisplayName(u.displayName ?? "");
      setPhotoURL(u.photoURL ?? "");
      setEmail(u.email ?? "");
      setLoading(false);
    });
    return unsub;
  }, [router]);

  async function onSave(e) {
    e.preventDefault();
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
      setOk("Profile updated!");
    } catch (err) {
      // A few common issues: requires recent login for sensitive changes (not typically for displayName/photoURL)
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="mt-2 text-sm opacity-80">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-[#0b210b] rounded-lg shadow">
      <header className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-gray-600">
              {(displayName?.[0] || email?.[0] || "U").toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-sm text-gray-400">Manage your account details</p>
        </div>
      </header>

      <form onSubmit={onSave} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Display name</span>
          <input
            className="rounded-md border px-3 py-2 bg-gray-50 text-gray-600"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Email (read-only)</span>
          <input
            className="rounded-md border px-3 py-2 bg-gray-50 text-gray-600"
            value={email}
            readOnly
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Photo URL</span>
          <input
            className="rounded-md border px-3 py-2 bg-gray-50 text-gray-600 "
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://…"
          />
          <span className="text-xs text-gray-400">
            Paste a direct image URL.
          </span>
        </label>

        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        {ok ? <div className="text-green-700 text-sm">{ok}</div> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#2f5f1f] text-white font-semibold px-4 py-2 hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-md border px-4 py-2"
          >
            Back to dashboard
          </button>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="ml-auto rounded-md border px-4 py-2 text-red-700 border-red-300 bg-red-200 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}