const BASE_URL = "http://localhost:3001"; // Replace with actual backend URL

/**
 * Request
 * @param {string} endpoint - The API route (e.g., "/users")
 */
export async function fetchApi(endpoint, options = {}) {
  const { method = "GET", body, headers, ...customConfig } = options;

  // 1. Set up standard headers
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // 2. Automatically attach Auth Token if it exists (Client-side only)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token"); // Adjust if you use cookies
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  // 3. Prepare the fetch configuration
  const config = {
    method,
    headers: { ...defaultHeaders, ...headers },
    ...customConfig,
  };

  // Stringify the body if it's an object
  if (body) {
    config.body = JSON.stringify(body);
  }

  // 4. Make the request and handle errors centrally
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
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
            localStorage.removeItem("token");
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
    console.error(`[API Error] ${method} ${endpoint}:`, error);
    throw error;
  }
}
