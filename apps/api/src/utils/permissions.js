// apps/api/src/utils/permissions.js
//
// Central permission vocabulary for the backend.
//
// Why this file exists:
// - Firebase claims, API payloads, and DB enum values all use slightly different wording
// - authorization is hierarchical, so we need one place that defines rank/order
// - employee writes should normalize role and permission inputs the same way every time
//
// This module keeps those rules together so auth middleware, controllers, and route guards
// do not each invent their own interpretation of "admin" or "super admin".

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
  // Administrator and SuperAdmin are treated as privileged platform access,
  // not just job titles, so controllers can use this helper to protect writes.
  return getAccessRank(value) >= ACCESS_RANK.admin;
}

module.exports = {
  getAccessRank,
  isHighPrivilegePermission,
  normalizeAccessLevel,
  normalizePermissionLevelInput,
  normalizeRoleInput,
};
