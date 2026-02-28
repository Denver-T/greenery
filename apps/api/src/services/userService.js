// In-memory stub data for scaffolding (SV-27)
// const users = [
//   { id: 1, name: "Tech One", role: "technician" },
//   { id: 2, name: "Manager One", role: "manager" },
// ];

const { getPool } = require("../db/index");

exports.getUsers = async () => {
  const pool = await getPool();
  const [rows] = await pool.query("SELECT * FROM user");
  return rows;
};

exports.getUserById = async (id) => {
  const pool = await getPool();
  const [rows] = await pool.query(
    "SELECT * FROM user WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

exports.createUser = async ({name,password,role}) => {
  const pool = await getPool();
  const [result] = await pool.query(
    "INSERT INTO user (name, password) VALUES (?, ?)",
    [name, password]
  );

  return {
    id: result.insertId,
    name,
    role,
  };
};