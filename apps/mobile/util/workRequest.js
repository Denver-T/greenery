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

// Alias of updateTaskStatus for callers operating on a work-request detail
// surface rather than a Dashboard assignment card. Both write work_reqs.status
// via PATCH /tasks/:id/status — the endpoint treats task ids and work_req ids
// as the same number because tasks ARE work_reqs.
export const updateWorkRequestStatus = async (id, status) => {
  return await apiFetch(`/tasks/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};
