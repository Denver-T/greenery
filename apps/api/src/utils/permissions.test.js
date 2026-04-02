const {
  getAccessRank,
  isHighPrivilegePermission,
  normalizeAccessLevel,
  normalizePermissionLevelInput,
  normalizeRoleInput,
} = require("./permissions");

describe("getAccessRank", () => {
  it("returns 1 for technician", () => {
    expect(getAccessRank("technician")).toBe(1);
  });

  it("returns 2 for manager", () => {
    expect(getAccessRank("manager")).toBe(2);
  });

  it("returns 3 for admin", () => {
    expect(getAccessRank("admin")).toBe(3);
  });

  it("returns 4 for superadmin", () => {
    expect(getAccessRank("superadmin")).toBe(4);
  });

  it("falls back to technician rank for unknown values", () => {
    // normalizeAccessLevel defaults unknown inputs to "technician"
    expect(getAccessRank("unknown")).toBe(1);
  });

  it("handles DB-style capitalized values via normalizeAccessLevel", () => {
    expect(getAccessRank("Technician")).toBe(1);
    expect(getAccessRank("Manager")).toBe(2);
    expect(getAccessRank("Administrator")).toBe(3);
    expect(getAccessRank("SuperAdmin")).toBe(4);
  });

  it("falls back to technician rank for null and undefined", () => {
    // normalizeAccessLevel returns fallback "technician" for null/undefined
    expect(getAccessRank(null)).toBe(1);
    expect(getAccessRank(undefined)).toBe(1);
  });
});

describe("normalizeAccessLevel", () => {
  it("normalizes DB enum values to lowercase canonical form", () => {
    expect(normalizeAccessLevel("Technician")).toBe("technician");
    expect(normalizeAccessLevel("Manager")).toBe("manager");
    expect(normalizeAccessLevel("Administrator")).toBe("admin");
    expect(normalizeAccessLevel("SuperAdmin")).toBe("superadmin");
  });

  it("passes through already-lowercase canonical values", () => {
    expect(normalizeAccessLevel("technician")).toBe("technician");
    expect(normalizeAccessLevel("manager")).toBe("manager");
    expect(normalizeAccessLevel("admin")).toBe("admin");
    expect(normalizeAccessLevel("superadmin")).toBe("superadmin");
  });

  it("returns fallback for null, undefined, or empty string", () => {
    expect(normalizeAccessLevel(null)).toBe("technician");
    expect(normalizeAccessLevel(undefined)).toBe("technician");
    expect(normalizeAccessLevel("")).toBe("technician");
  });

  it("uses a custom fallback when provided", () => {
    expect(normalizeAccessLevel("", "manager")).toBe("manager");
  });
});

describe("normalizeRoleInput", () => {
  it("normalizes lowercase inputs to DB role names", () => {
    expect(normalizeRoleInput("technician")).toBe("Technician");
    expect(normalizeRoleInput("manager")).toBe("Manager");
    expect(normalizeRoleInput("admin")).toBe("Administrator");
    expect(normalizeRoleInput("administrator")).toBe("Administrator");
  });

  it("defaults to Technician for null, undefined, or empty string", () => {
    expect(normalizeRoleInput(null)).toBe("Technician");
    expect(normalizeRoleInput(undefined)).toBe("Technician");
    expect(normalizeRoleInput("")).toBe("Technician");
  });

  it("uses a custom default when provided", () => {
    expect(normalizeRoleInput("", "Manager")).toBe("Manager");
  });

  it("returns the input trimmed if not in the map", () => {
    expect(normalizeRoleInput("  custom  ")).toBe("custom");
  });
});

describe("normalizePermissionLevelInput", () => {
  it("normalizes lowercase inputs to DB permission names", () => {
    expect(normalizePermissionLevelInput("technician")).toBe("Technician");
    expect(normalizePermissionLevelInput("manager")).toBe("Manager");
    expect(normalizePermissionLevelInput("admin")).toBe("Administrator");
    expect(normalizePermissionLevelInput("superadmin")).toBe("SuperAdmin");
    expect(normalizePermissionLevelInput("super admin")).toBe("SuperAdmin");
  });

  it("defaults to Technician for null, undefined, or empty string", () => {
    expect(normalizePermissionLevelInput(null)).toBe("Technician");
    expect(normalizePermissionLevelInput(undefined)).toBe("Technician");
    expect(normalizePermissionLevelInput("")).toBe("Technician");
  });
});

describe("isHighPrivilegePermission", () => {
  it("returns true for admin and superadmin", () => {
    expect(isHighPrivilegePermission("admin")).toBe(true);
    expect(isHighPrivilegePermission("Administrator")).toBe(true);
    expect(isHighPrivilegePermission("superadmin")).toBe(true);
    expect(isHighPrivilegePermission("SuperAdmin")).toBe(true);
  });

  it("returns false for technician and manager", () => {
    expect(isHighPrivilegePermission("technician")).toBe(false);
    expect(isHighPrivilegePermission("Technician")).toBe(false);
    expect(isHighPrivilegePermission("manager")).toBe(false);
    expect(isHighPrivilegePermission("Manager")).toBe(false);
  });

  it("returns false for unknown values", () => {
    expect(isHighPrivilegePermission("unknown")).toBe(false);
    expect(isHighPrivilegePermission(null)).toBe(false);
  });
});
