import { getBearerToken } from "./firebase";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL; // Replace with actual backend URL

export async function apiFetch(path, options = {}) {
  const token = await getBearerToken();
  const { method = "GET", body, ...customConfig } = options;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  const isFormData = body instanceof FormData;

  if (isFormData) {
    // ⚠️ CRITICAL: We MUST remove Content-Type so React Native can auto-generate the boundary
    delete headers["Content-Type"];
  } else if (!headers["Content-Type"]) {
    // If it's normal text data, default to JSON
    headers["Content-Type"] = "application/json";
  }

  const config = {
    method,
    headers,
    ...customConfig,
  };

  if (body) {
    // If it's FormData, pass it raw. Otherwise, stringify it for JSON.
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Throw an error that components can catch
      const status = response.status;
      const errorMessage = data.error || data.message || `HTTP Error ${status}`;

      switch (status) {
        case 400:
          console.error("❌ Bad Request: The data sent was invalid.");
          break;
        case 401:
          console.error("🔒 Unauthorized: Token missing or expired.");
          // Global Action: Clear local storage and force redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          break;
        case 403:
          console.error(
            "🛑 Forbidden: You do not have permission (e.g., not an Admin).",
          );
          break;
        case 404:
          console.error("👻 Not Found: The requested resource does not exist.");
          break;
        case 500:
          console.error("🔥 Server Error: The backend is having a bad day.");
          break;
        default:
          console.error(`⚠️ Unhandled Error (${status}):`, errorMessage);
      }
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${method} ${path}:`, error);
    throw error;
  }
}
