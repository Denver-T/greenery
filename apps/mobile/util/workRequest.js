import { apiFetch } from "./api";

// get all work requests
export const getAllWorkRequest = async () => {
  return await apiFetch("/reqs");
};

// get work request detail by ID
export const getWorkRequestById = async (id) => {
  return await apiFetch(`/reqs/${id}`);
};

//create new work request
export const createWorkRequest = async (formData) => {
  return await apiFetch("/reqs", { method: "POST", body: formData });
};

// update task status (e.g. mark complete)
export const updateTaskStatus = async (id, status) => {
  return await apiFetch(`/tasks/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};
