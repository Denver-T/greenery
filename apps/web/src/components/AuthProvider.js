"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/app/lib/firebaseClient";

const AuthContext = createContext(null);

const PUBLIC_PATHS = new Set(["/", "/login"]);
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchAuthenticatedAccount(firebaseUser) {
  const token = await firebaseUser.getIdToken(true);
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      "This login is not linked to an active employee account.";
    throw new Error(message);
  }

  return payload?.data ?? payload;
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError("");

      if (!nextUser) {
        setFirebaseUser(null);
        setAccount(null);
        setLoading(false);

        if (!PUBLIC_PATHS.has(pathname)) {
          router.replace("/login");
        }
        return;
      }

      try {
        const nextAccount = await fetchAuthenticatedAccount(nextUser);

        if (cancelled) {
          return;
        }

        setFirebaseUser(nextUser);
        setAccount(nextAccount);

        if (PUBLIC_PATHS.has(pathname)) {
          router.replace("/dashboard");
        }
      } catch (err) {
        await signOut(auth).catch(() => {});

        if (cancelled) {
          return;
        }

        setFirebaseUser(null);
        setAccount(null);
        setError(err.message || "Access denied.");

        if (!PUBLIC_PATHS.has(pathname)) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pathname, router]);

  const value = useMemo(
    () => ({
      user: firebaseUser,
      account,
      loading,
      error,
      isAuthenticated: Boolean(firebaseUser && account),
      async logout() {
        setError("");
        await signOut(auth);
        router.replace("/login");
      },
    }),
    [account, error, firebaseUser, loading, router]
  );

  const isPublicPath = PUBLIC_PATHS.has(pathname);

  return (
    <AuthContext.Provider value={value}>
      {!isPublicPath && loading ? (
        <div className="grid min-h-screen place-items-center bg-[#f7f5ef] p-6 text-center text-gray-700">
          Checking your employee access...
        </div>
      ) : !isPublicPath && !value.isAuthenticated ? (
        <div className="grid min-h-screen place-items-center bg-[#f7f5ef] p-6 text-center text-red-700">
          {error || "Redirecting to login..."}
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
