jest.mock("../db");

const db = require("../db");
const employeesService = require("./employeesService");
const { employee } = require("../test/factories");
const { selectResult, insertResult, updateResult, deleteResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("listEmployees", () => {
  it("returns all employee rows from the database", async () => {
    const rows = [employee(), employee({ id: 2, name: "Second" })];
    db.query.mockResolvedValue(selectResult(rows));

    const result = await employeesService.listEmployees();

    expect(result).toHaveLength(2);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY")
    );
  });

  it("returns an empty array when no employees exist", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await employeesService.listEmployees();

    expect(result).toEqual([]);
  });
});

describe("getEmployeeById", () => {
  it("returns the employee when found", async () => {
    const emp = employee({ id: 7 });
    db.query.mockResolvedValue(selectResult([emp]));

    const result = await employeesService.getEmployeeById(7);

    expect(result).toEqual(emp);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ?"),
      [7]
    );
  });

  it("returns null when the employee is not found", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await employeesService.getEmployeeById(999);

    expect(result).toBeNull();
  });
});

describe("getEmployeeByEmail", () => {
  it("performs a case-insensitive lookup", async () => {
    const emp = employee({ email: "user@example.com" });
    db.query.mockResolvedValue(selectResult([emp]));

    const result = await employeesService.getEmployeeByEmail("USER@EXAMPLE.COM");

    expect(result).toEqual(emp);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("LOWER(email) = LOWER(?)"),
      ["USER@EXAMPLE.COM"]
    );
  });

  it("returns null when the email is not found", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await employeesService.getEmployeeByEmail("noone@example.com");

    expect(result).toBeNull();
  });
});

describe("createEmployee", () => {
  it("inserts a new employee and returns the created row", async () => {
    const created = employee({ id: 10 });
    db.query
      .mockResolvedValueOnce(insertResult(10))   // INSERT
      .mockResolvedValueOnce(selectResult([created])); // getEmployeeById

    const result = await employeesService.createEmployee({
      name: "Test Tech",
      email: "tech@greenery.test",
      phone: "555-123-4567",
    });

    expect(result).toEqual(created);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("throws when name is empty", async () => {
    await expect(
      employeesService.createEmployee({ name: "" })
    ).rejects.toThrow("Name is required");
  });

  it("throws when name exceeds the character limit", async () => {
    await expect(
      employeesService.createEmployee({ name: "A".repeat(26) })
    ).rejects.toThrow("characters or less");
  });

  it("throws when phone format is invalid", async () => {
    await expect(
      employeesService.createEmployee({ name: "Test", phone: "12345" })
    ).rejects.toThrow("Phone must be in the format");
  });

  it("defaults role to Technician when not provided", async () => {
    const created = employee({ id: 11 });
    db.query
      .mockResolvedValueOnce(insertResult(11))
      .mockResolvedValueOnce(selectResult([created]));

    await employeesService.createEmployee({ name: "New Tech" });

    const insertCall = db.query.mock.calls[0];
    const params = insertCall[1];
    // role is the second param in the INSERT
    expect(params[1]).toBe("Technician");
  });
});

describe("updateEmployee", () => {
  it("updates and returns the employee when found", async () => {
    const updated = employee({ id: 5, name: "Updated" });
    db.query
      .mockResolvedValueOnce(updateResult(1))   // UPDATE
      .mockResolvedValueOnce(selectResult([updated])); // getEmployeeById

    const result = await employeesService.updateEmployee(5, {
      name: "Updated",
    });

    expect(result).toEqual(updated);
  });

  it("returns null when the employee is not found", async () => {
    db.query.mockResolvedValueOnce(updateResult(0));

    const result = await employeesService.updateEmployee(999, {
      name: "Ghost",
    });

    expect(result).toBeNull();
  });
});

describe("deleteEmployee", () => {
  it("returns true when the employee is deleted", async () => {
    db.query.mockResolvedValue(deleteResult(1));

    const result = await employeesService.deleteEmployee(5);

    expect(result).toBe(true);
  });

  it("returns false when the employee does not exist", async () => {
    db.query.mockResolvedValue(deleteResult(0));

    const result = await employeesService.deleteEmployee(999);

    expect(result).toBe(false);
  });
});

describe("mapEmployeeToAccount", () => {
  it("maps an employee row to the account shape", () => {
    const emp = employee({ role: "Technician" });

    const account = employeesService.mapEmployeeToAccount(emp);

    expect(account).toEqual(
      expect.objectContaining({
        id: emp.id,
        name: emp.name,
        role: "technician",
        email: emp.email,
      })
    );
  });

  it("returns null for null input", () => {
    expect(employeesService.mapEmployeeToAccount(null)).toBeNull();
  });
});
