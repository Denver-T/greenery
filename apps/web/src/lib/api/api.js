import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/lib/firebaseClient";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

async function waitForFirebaseUser() {
  if (typeof window === "undefined") {
    return null;
  }

  if (auth.currentUser !== null) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

export async function fetchApi(endpoint, options = {}) {
  const { method = "GET", body, headers, ...customConfig } = options;
  const defaultHeaders = {};

  if (!isFormData(body)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const user = await waitForFirebaseUser();
  if (user) {
    const token = await user.getIdToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers: { ...defaultHeaders, ...headers },
    ...customConfig,
  };

  if (body !== undefined) {
    config.body = isFormData(body) ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof payload === "string" ? payload : payload?.error || payload?.message) ||
        `HTTP Error ${response.status}`;

      if (response.status === 401 && typeof window !== "undefined") {
        window.location.href = "/login";
      }

      throw new Error(errorMessage);
    }

    if (typeof payload === "string") {
      return payload;
    }

    return payload?.data ?? payload;
  } catch (error) {
    console.error(`[API Error] ${method} ${endpoint}:`, error);
    throw error;
  }
}
