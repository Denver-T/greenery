import { useEffect, useState } from "react";
import { auth } from "@/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

function useFirebaseUser() {
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { user, loading };
}