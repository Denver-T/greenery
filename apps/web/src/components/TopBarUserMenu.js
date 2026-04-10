"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "@/app/lib/firebaseClient";
import { fetchApi } from "@/lib/api/api";

export default function TopBarUserMenu() {
  const router = useRouter();
  const containerRef = useRef(null);
  const mountedRef = useRef(true);

  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Track mount state so async sign-out can avoid setting state after unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mirror Sidebar's auth fetching pattern (do not reach into auth.currentUser).
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const user = await fetchApi("/auth/me", { cache: "no-store" });
        if (!cancelled) {
          setCurrentUser(user);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Outside click + Escape close.
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleEsc(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      await signOut(auth);
      router.replace("/");
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "Sign-out failed.");
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const displayName =
    currentUser?.name ||
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    "Account";
  const initial = displayName?.[0]?.toUpperCase() ?? "U";
  const photoURL = authUser?.photoURL || "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User menu"
        className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-2 py-1 text-foreground hover:bg-surface-muted dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-background text-sm font-black text-foreground dark:bg-[linear-gradient(180deg,#d8c9a4_0%,#b59d72_100%)] dark:text-[#1c1f25]">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </span>
        <span className="hidden pr-2 text-sm font-bold lg:block">
          {displayName}
        </span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="User menu options"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-border-soft bg-surface p-2 shadow-2xl dark:border-white/10 dark:bg-[#23262d]"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted dark:hover:bg-white/10"
          >
            View profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={busy}
            className="mt-1 block w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
          {error ? (
            <p
              role="alert"
              className="mt-2 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
