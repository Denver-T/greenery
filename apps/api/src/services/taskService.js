let nextId = 3;

// In-memory stub data for scaffolding (SV-27)
let tasks = [
  { id: 1, title: "Water Monstera", status: "assigned" },
  { id: 2, title: "Inspect Fiddle Leaf Fig", status: "in_progress" },
];

exports.getTasks = async () => {
  return tasks;
};

exports.createTask = async (payload) => {
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const status =
    typeof payload?.status === "string" ? payload.status.trim() : "assigned";

  const created = {
    id: nextId++,
    title: title || "Untitled Task",
    status: status || "assigned",
  };

  tasks.push(created);
  return created;
};

exports.getTaskById = async (id) => {
  const num = Number(id);
  return tasks.find((t) => t.id === num) || null;
};

exports.updateTaskStatus = async (id, payload) => {
  const num = Number(id);
  const task = tasks.find((t) => t.id === num);
  if (!task) return null;

  const status = typeof payload?.status === "string" ? payload.status.trim() : "";
  if (status) task.status = status;

  return task;
};