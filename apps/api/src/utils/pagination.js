function parsePagination(query, defaults = {}) {
  const maxPageSize = 100;
  const defaultPageSize = defaults.pageSize || 25;

  // If no pagination params provided, return null (caller should return all results)
  if (query.page === undefined && query.pageSize === undefined) {
    return null;
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(query.pageSize, 10) || defaultPageSize));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

function paginatedResponse(rows, totalCount, page, pageSize) {
  return { data: rows, page, pageSize, totalCount };
}

module.exports = { parsePagination, paginatedResponse };
