import { apiFetch } from "./api";

// get all work requests
export const getAllWorkRequest = async () => {
  return await apiFetch("/reqs");
};

// get work request detail by ID
export const getWorkRequestById = async (id) => {
  return await apiFetch(`/reqs/${id}`);
};
