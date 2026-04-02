jest.mock("../db");

const db = require("../db");
const taskService = require("./taskService");
const { workReqRow } = require("../test/factories");
const { selectResult, insertResult, updateResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getTasks", () => {
  it("returns mapped tasks from work_reqs", async () => {
    const rows = [workReqRow(), workReqRow({ id: 2 })];
    db.query.mockResolvedValue(selectResult(rows));

    const result = await taskService.getTasks();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe(rows[0].actionRequired);
    expect(result[0].assigned_to).toBe(rows[0].assignedTo);
  });

  it("filters by employeeId when provided", async () => {
    db.query.mockResolvedValue(selectResult([]));

    await taskService.getTasks(null, 5);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("assignedTo = ?"),
      [5]
    );
  });

  it("includes unassigned tasks when scope is 'assignment'", async () => {
    db.query.mockResolvedValue(selectResult([]));

    await taskService.getTasks("assignment");

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("'unassigned'"),
      []
    );
  });
});

describe("getTaskById", () => {
  it("returns the mapped task when found", async () => {
    const row = workReqRow({ id: 3 });
    db.query.mockResolvedValue(selectResult([row]));

    const result = await taskService.getTaskById(3);

    expect(result.id).toBe(3);
    expect(result.title).toBe(row.actionRequired);
  });

  it("returns null when the task is not found", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await taskService.getTaskById(999);

    expect(result).toBeNull();
  });

  it("throws 400 for invalid task ID", async () => {
    await expect(taskService.getTaskById("abc")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("createTask", () => {
  it("inserts into work_reqs and returns the created task", async () => {
    const created = workReqRow({ id: 10 });
    db.query
      .mockResolvedValueOnce(selectResult([{ id: 1 }]))   // ensureEmployeeExists
      .mockResolvedValueOnce(insertResult(10))             // INSERT
      .mockResolvedValueOnce(selectResult([created]));     // getTaskById

    const result = await taskService.createTask({
      title: "New task",
      status: "assigned",
      assigned_to: 1,
    });

    expect(result.id).toBe(10);
  });

  it("throws 400 when title is missing", async () => {
    await expect(
      taskService.createTask({ title: "" })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("title"),
    });
  });

  it("throws 400 for an invalid status value", async () => {
    await expect(
      taskService.createTask({ title: "Task", status: "bogus" })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when notes is not a string", async () => {
    await expect(
      taskService.createTask({ title: "Task", notes: 123 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("notes"),
    });
  });

  it("throws 404 when assigned employee does not exist", async () => {
    db.query.mockResolvedValueOnce(selectResult([])); // ensureEmployeeExists

    await expect(
      taskService.createTask({ title: "Task", assigned_to: 999 })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "EMPLOYEE_NOT_FOUND",
    });
  });
});

describe("updateTaskStatus", () => {
  it("updates the status and returns the updated task", async () => {
    const updated = workReqRow({ id: 5, status: "completed" });
    db.query
      .mockResolvedValueOnce(updateResult(1))          // UPDATE
      .mockResolvedValueOnce(selectResult([updated]));  // getTaskById

    const result = await taskService.updateTaskStatus(5, "completed");

    expect(result.status).toBe("completed");
  });

  it("returns null when the task is not found", async () => {
    db.query.mockResolvedValueOnce(updateResult(0));

    const result = await taskService.updateTaskStatus(999, "completed");

    expect(result).toBeNull();
  });

  it("throws 400 for an invalid status", async () => {
    await expect(
      taskService.updateTaskStatus(1, "invalid")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for an invalid task ID", async () => {
    await expect(
      taskService.updateTaskStatus("abc", "completed")
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("assignTask", () => {
  it("assigns the task to an employee and returns the updated task", async () => {
    const updated = workReqRow({ id: 5, assignedTo: 2, status: "assigned" });
    db.query
      .mockResolvedValueOnce(selectResult([{ id: 2 }]))  // ensureEmployeeExists
      .mockResolvedValueOnce(updateResult(1))             // UPDATE
      .mockResolvedValueOnce(selectResult([updated]));    // getTaskById

    const result = await taskService.assignTask(5, { assigned_to: 2 });

    expect(result.assigned_to).toBe(2);
  });

  it("returns null when the task is not found", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ id: 2 }]))  // ensureEmployeeExists
      .mockResolvedValueOnce(updateResult(0));            // UPDATE

    const result = await taskService.assignTask(999, { assigned_to: 2 });

    expect(result).toBeNull();
  });

  it("throws 404 when the assigned employee does not exist", async () => {
    db.query.mockResolvedValueOnce(selectResult([])); // ensureEmployeeExists

    await expect(
      taskService.assignTask(5, { assigned_to: 999 })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "EMPLOYEE_NOT_FOUND",
    });
  });

  it("throws 400 for an invalid task ID", async () => {
    await expect(
      taskService.assignTask("abc", { assigned_to: 1 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
