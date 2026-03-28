// apps/api/src/utils/permissions.js
// Canonical permission helpers shared by auth, authorization, and employee writes.

const DB_ROLE_MAP = {
  technician: "Technician",
  manager: "Manager",
  admin: "Administrator",
  administrator: "Administrator",
};

const DB_PERMISSION_MAP = {
  technician: "Technician",
  manager: "Manager",
  admin: "Administrator",
  administrator: "Administrator",
  superadmin: "SuperAdmin",
  "super admin": "SuperAdmin",
};

const ACCESS_LEVEL_MAP = {
  Technician: "technician",
  Manager: "manager",
  Administrator: "admin",
  SuperAdmin: "superadmin",
  technician: "technician",
  manager: "manager",
  admin: "admin",
  administrator: "admin",
  superadmin: "superadmin",
};

const ACCESS_RANK = {
  technician: 1,
  manager: 2,
  admin: 3,
  superadmin: 4,
};

function normalizeRoleInput(value, defaultRole = "Technician") {
  if (value === undefined || value === null || value === "") {
    return defaultRole;
  }

  const normalized = String(value).trim();
  return DB_ROLE_MAP[normalized.toLowerCase()] || normalized;
}

function normalizePermissionLevelInput(value, defaultPermission = "Technician") {
  if (value === undefined || value === null || value === "") {
    return defaultPermission;
  }

  const normalized = String(value).trim();
  return DB_PERMISSION_MAP[normalized.toLowerCase()] || normalized;
}

function normalizeAccessLevel(value, fallback = "technician") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim();
  return ACCESS_LEVEL_MAP[normalized] || ACCESS_LEVEL_MAP[normalized.toLowerCase()] || fallback;
}

function getAccessRank(value) {
  const level = normalizeAccessLevel(value);
  return ACCESS_RANK[level] || 0;
}

function isHighPrivilegePermission(value) {
  return getAccessRank(value) >= ACCESS_RANK.admin;
}

module.exports = {
  getAccessRank,
  isHighPrivilegePermission,
  normalizeAccessLevel,
  normalizePermissionLevelInput,
  normalizeRoleInput,
};
