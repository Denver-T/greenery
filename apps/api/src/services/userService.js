
const { getPool } = require("../db/index");

exports.getUsers = async () => {
  const pool = await getPool();
  const [rows] = await pool.query("SELECT * FROM accounts");
  return rows;
};

exports.getUserById = async (id) => {
  const pool = await getPool();
  const [rows] = await pool.query(
    "SELECT * FROM accounts WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

exports.createUser = async (userData) => {
  const pool = await getPool();
  const {name, role, email, phone} = userData;
  const [result] = await pool.query(
    "INSERT INTO accounts (name, role, email, phone) VALUES (?, ?, ?, ?)",
    [name, role, email || null, phone || null]
  );

  return {
    id: result.insertId,
    name,
    role,
    email: email || null, 
    phone: phone || null
  };
};