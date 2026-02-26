
const userService = require("./userService");
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

exports.updateTaskStatus = async (id, status) => {
  const pool = await getPool();
  const [result] = await pool.query(
    `
    UPDATE Tasks
    SET Status = ?, ChangeTime = NOW()
    WHERE TaskID = ?
    `,
    [status, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  // Return updated task
  const [rows] = await pool.query(
    `SELECT * FROM tasks WHERE TaskID = ?`,
    [id]
  );

  return rows[0];
};

exports.assignTask = async (id, assignedUserId) => {
   const pool = await getPool();
  if (!assignedUserId) {
    throw new Error("assignedUserId is required");
  }

  const user = await userService.getUserById(assignedUserId);
  if (!user) {
    throw new Error("Assigned user does not exist");
  }

  const [result] = await pool.query(
    `
    UPDATE Tasks
    SET AssignedUserId = ?, ChangeTime = NOW()
    WHERE TaskID = ?
    `,
    [assignedUserId, id]
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    "SELECT * FROM Tasks WHERE TaskID = ?",
    [id]
  );

  return rows[0];
};