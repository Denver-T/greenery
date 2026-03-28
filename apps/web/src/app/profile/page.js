"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import AppShell from "@/components/AppShell";

function ProfilePreview({ displayName, email, photoURL }) {
  return (
    <div className="rounded-[28px] border border-border-soft bg-[linear-gradient(145deg,#294733_0%,#1f3427_100%)] px-7 py-7 text-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[24px] border border-white/12 bg-white/90 text-3xl font-black text-[#1f3427]">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span>{(displayName?.[0] || email?.[0] || "U").toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              Identity Preview
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight leading-none md:text-4xl">
              {displayName || "Unnamed User"}
            </h2>
            <p className="mt-3 break-all text-sm text-white/72">{email || "No email available"}</p>
          </div>
        </div>

        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/8 px-5 py-4 text-sm text-white/78">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            Session
          </div>
          <div className="mt-2 font-semibold text-white">Authenticated</div>
          <div className="mt-1">Firebase-backed account</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="flex min-h-[188px] flex-col rounded-2xl border border-border-soft bg-[#fffdf7] p-5 shadow-soft">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-4 break-words text-[2rem] font-black tracking-tight leading-tight text-[#1f3427]">
        {value}
      </div>
      <div className="mt-3 text-sm leading-6 text-gray-600">{hint}</div>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/");
        return;
      }
      setDisplayName(u.displayName ?? "");
      setPhotoURL(u.photoURL ?? "");
      setEmail(u.email ?? "");
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const initials = useMemo(
    () => (displayName?.[0] || email?.[0] || "U").toUpperCase(),
    [displayName, email]
  );

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

      setOk("Profile updated successfully.");
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await signOut(auth);
    router.replace("/");
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <p className="text-sm text-gray-600">Loading profile…</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile">
      <section className="space-y-7">
        <ProfilePreview displayName={displayName} email={email} photoURL={photoURL} />

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard
            label="Display Name"
            value={displayName || initials}
            hint="This is how your teammates will see you in collaborative spaces."
          />
          <StatCard
            label="Email"
            value={email || "Unavailable"}
            hint="Email is managed by authentication and shown here as a reference."
          />
          <StatCard
            label="Photo Status"
            value={photoURL ? "Configured" : "Missing"}
            hint="Add a profile image URL to make your account easier to recognize."
          />
        </div>

        <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
          <form
            onSubmit={onSave}
            className="rounded-card border border-border-soft bg-surface p-7 shadow-soft"
          >
            <div className="mb-6">
              <div className="w-fit rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1f3427]">
                Account Settings
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-[#1f3427]">
                Update Your Profile
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Keep the account details current so your identity looks consistent across the app.
              </p>
            </div>

            <div className="grid gap-6">
              <FormField label="Display Name" hint="Shown in the workspace and profile previews.">
                <input
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-800 outline-none focus:ring-2 focus:ring-brand/30"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </FormField>

              <FormField label="Email Address" hint="Managed by authentication and currently read-only.">
                <input
                  className="rounded-xl border border-border-soft bg-[#f8f4ea] px-3 py-2.5 text-gray-600 outline-none"
                  value={email}
                  readOnly
                />
              </FormField>

              <FormField label="Photo URL" hint="Paste a direct image URL for your profile avatar.">
                <input
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-800 outline-none focus:ring-2 focus:ring-brand/30"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </FormField>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border-soft pt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white shadow-soft disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border border-border-soft bg-white px-5 py-2.5 font-semibold text-gray-800"
              >
                Back to Dashboard
              </button>
            </div>
          </form>

          <div className="space-y-5">
            <div className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
              <h3 className="text-2xl font-black tracking-tight text-[#1f3427]">
                Account Actions
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Use these actions when you need to leave the workspace or navigate back to operations.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="w-full rounded-xl border border-border-soft bg-[#fffdf7] px-4 py-3 text-left font-semibold text-[#1f3427]"
                >
                  Return to operations dashboard
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-semibold text-red-700"
                >
                  Sign out of this account
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}
            {ok ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {ok}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
