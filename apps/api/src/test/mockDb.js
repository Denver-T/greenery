// Helpers for mocking the DB layer in tests.
// mysql2 .query() returns tuples whose shape depends on the SQL operation:
//   SELECT:  [[row1, row2, ...], fieldDefinitions]
//   INSERT:  [{ insertId, affectedRows, ... }, undefined]
//   UPDATE:  [{ affectedRows, changedRows, ... }, undefined]
//   DELETE:  [{ affectedRows, ... }, undefined]

function selectResult(rows) {
  return [rows, []];
}

function insertResult(insertId, affectedRows = 1) {
  return [{ insertId, affectedRows }, undefined];
}

function updateResult(affectedRows, changedRows = affectedRows) {
  return [{ affectedRows, changedRows }, undefined];
}

function deleteResult(affectedRows) {
  return [{ affectedRows }, undefined];
}

module.exports = {
  selectResult,
  insertResult,
  updateResult,
  deleteResult,
};
