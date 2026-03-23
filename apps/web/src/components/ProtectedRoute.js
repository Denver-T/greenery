"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseUser } from "@/app/lib/useFirebaseUser";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, loading } = useFirebaseUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [router, user, loading]);

  if (loading || !user) {
    return <div className="p-6">Checking authentication...</div>;
  }

  return children;
}
