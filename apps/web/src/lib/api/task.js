import { fetchApi } from "./api";

// get all tasks
export const getAllTask = async () => {
  return await fetchApi("/tasks");
};

// get task by id
export const getTaskById = async (id) => {
  return await fetchApi(`/tasks/${id}`);
};

// create new task
export const createTask = async (taskData) => {
  return await fetchApi("/tasks", {
    method: "POST",
    body: taskData,
  });
};

// update task status
export const updateTaskStatus = async (id, status) => {
  return await fetchApi(`/tasks/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
};

// assign task to user
export const assignTask = async (id, assignedUserId) => {
  return await fetchApi(`/tasks/${id}/assign`, {
    method: "PATCH",
    body: { assigned_to: assignedUserId },
  });
};
