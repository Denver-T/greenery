let nextId = 3;

// In-memory stub data for scaffolding (SV-27)
let tasks = [
  { id: 1, title: "Water Monstera", status: "assigned" },
  { id: 2, title: "Inspect Fiddle Leaf Fig", status: "in_progress" },
];

const { getPool } = require("../db/index");

exports.getTasks = async () => {
  const pool = await getPool();
  const [rows] = await pool.query("SELECT * FROM tasks");
  return rows;
};

exports.createTask = async (taskData) => {
  const pool = await getPool();

  const [result] = await pool.query(
    `
    INSERT INTO Tasks
      (TaskTitle, Status, AssignedUserId, CreatedByUserId, Description, CreateTime)
    VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [
      taskData.title,
      taskData.status,
      taskData.assignedUser,
      taskData.createUser,
      taskData.description,
    ]
  );

  return {
    TaskID: result.insertId,
    ...taskData,
  };
};

exports.getTaskById = async (id) => {
  const pool = await getPool();
  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE TaskID = ?",
    [id]
  );
  return rows[0] || null;
};

exports.updateTaskStatus = async (id, payload) => {
  const num = Number(id);
  const task = tasks.find((t) => t.id === num);
  if (!task) return null;

  const status = typeof payload?.status === "string" ? payload.status.trim() : "";
  if (status) task.status = status;

  return task;
};