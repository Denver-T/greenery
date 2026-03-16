import { getBearerToken } from "./firebase";

export async function apiFetch(path, options = {}) {
  const token = await getBearerToken();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  return fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}