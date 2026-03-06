
const userService = require("./userService");

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
    INSERT INTO tasks
      (title, status, assigned_to, plant_id, notes, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      taskData.title,
      taskData.status || 'assigned',
      taskData.assigned_to || null,  
      taskData.plant_id || null, 
      taskData.notes || null,
      taskData.due_date || null
    ]
  );

  return {
    id: result.insertId,
    ...taskData,
  };
};

exports.getTaskById = async (id) => {
  const pool = await getPool();
  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

exports.updateTaskStatus = async (id, status) => {
  const pool = await getPool();
  const [result] = await pool.query(
    `
    UPDATE tasks
    SET status = ?
    WHERE id = ?
    `,
    [status, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  // Return updated task
  const [rows] = await pool.query(
    `SELECT * FROM tasks WHERE id = ?`,
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
    UPDATE tasks
    SET assigned_to = ?
    WHERE id = ?
    `,
    [assignedUserId, id]
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );

  return rows[0];
};