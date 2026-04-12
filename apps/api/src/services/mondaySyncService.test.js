jest.mock("../db");
jest.mock("../lib/env", () => ({
  MONDAY_API_TOKEN: "test-token",
  MONDAY_BOARD_ID: "8887438729",
  MONDAY_API_VERSION: "2024-10",
}));
jest.mock("../lib/mondayClient");

const db = require("../db");
const mondayClient = require("../lib/mondayClient");
const { insertResult, updateResult, selectResult, deleteResult } = require("../test/mockDb");
const syncService = require("./mondaySyncService");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const sampleWorkReq = {
  id: 42,
  referenceNumber: "WR-2026-0001",
  account: "Green Corp",
  actionRequired: "Replace fern",
  monday_item_id: null,
};

describe("pushCreate", () => {
  it("creates a Monday item and stores the ID on the work_req", async () => {
    mondayClient.createItem.mockResolvedValue("123456");
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushCreate(sampleWorkReq);

    expect(mondayClient.createItem).toHaveBeenCalledWith(
      "8887438729",
      "WR-2026-0001",
      expect.any(Object),
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE work_reqs SET monday_item_id"),
      ["123456", 42],
    );
  });

  it("enqueues on Monday API failure", async () => {
    mondayClient.createItem.mockRejectedValue(new Error("Monday down"));
    db.query.mockResolvedValue(insertResult(1));

    await syncService.pushCreate(sampleWorkReq);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO monday_sync_queue"),
      expect.any(Array),
    );
  });
});

describe("pushUpdate", () => {
  it("updates the Monday item", async () => {
    mondayClient.updateItem.mockResolvedValue();
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushUpdate({ ...sampleWorkReq, monday_item_id: "123456" });

    expect(mondayClient.updateItem).toHaveBeenCalledWith(
      "8887438729",
      "123456",
      expect.any(Object),
    );
  });

  it("skips if no monday_item_id", async () => {
    await syncService.pushUpdate(sampleWorkReq);
    expect(mondayClient.updateItem).not.toHaveBeenCalled();
  });

  it("enqueues on failure", async () => {
    mondayClient.updateItem.mockRejectedValue(new Error("timeout"));
    db.query.mockResolvedValue(insertResult(1));

    await syncService.pushUpdate({ ...sampleWorkReq, monday_item_id: "123" });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO monday_sync_queue"),
      expect.any(Array),
    );
  });
});

describe("pushDelete", () => {
  it("deletes the Monday item", async () => {
    mondayClient.deleteItem.mockResolvedValue();

    await syncService.pushDelete({ ...sampleWorkReq, monday_item_id: "123456" });

    expect(mondayClient.deleteItem).toHaveBeenCalledWith("123456");
  });

  it("skips if no monday_item_id", async () => {
    await syncService.pushDelete(sampleWorkReq);
    expect(mondayClient.deleteItem).not.toHaveBeenCalled();
  });
});

describe("drainQueue", () => {
  it("processes pending create items and removes them on success", async () => {
    const queueRow = {
      id: 1,
      work_req_id: 42,
      operation: "create",
      payload: JSON.stringify(sampleWorkReq),
      attempts: 0,
    };

    db.query
      .mockResolvedValueOnce(selectResult([queueRow])) // SELECT from queue
      .mockResolvedValueOnce(updateResult(1))           // UPDATE work_reqs
      .mockResolvedValueOnce(deleteResult(1));           // DELETE from queue

    mondayClient.createItem.mockResolvedValue("789");

    await syncService.drainQueue();

    expect(mondayClient.createItem).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM monday_sync_queue"),
      [1],
    );
  });

  it("increments attempts on failure", async () => {
    const queueRow = {
      id: 1,
      work_req_id: 42,
      operation: "create",
      payload: JSON.stringify(sampleWorkReq),
      attempts: 2,
    };

    db.query
      .mockResolvedValueOnce(selectResult([queueRow]))   // SELECT
      .mockResolvedValueOnce(updateResult(1));            // UPDATE queue

    mondayClient.createItem.mockRejectedValue(new Error("rate limited"));

    await syncService.drainQueue();

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("SET attempts = ?"),
      expect.arrayContaining([3, "rate limited"]),
    );
  });

  it("does nothing when queue is empty", async () => {
    db.query.mockResolvedValueOnce(selectResult([]));

    await syncService.drainQueue();

    expect(mondayClient.createItem).not.toHaveBeenCalled();
  });
});
