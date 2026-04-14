jest.mock("../db");
jest.mock("../lib/env", () => ({
  MONDAY_API_TOKEN: "test-token",
  MONDAY_BOARD_ID: "8887438729",
  MONDAY_API_VERSION: "2024-10",
}));
jest.mock("../lib/mondayClient");

const db = require("../db");
const mondayClient = require("../lib/mondayClient");
const {
  insertResult,
  updateResult,
  selectResult,
  deleteResult,
} = require("../test/mockDb");
const syncService = require("./mondaySyncService");
const loopPrevention = require("../utils/loopPreventionSet");
const handler = require("./mondayWebhookHandler");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  loopPrevention.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  loopPrevention.clear();
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

    await syncService.pushUpdate({
      ...sampleWorkReq,
      monday_item_id: "123456",
    });

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

    await syncService.pushDelete({
      ...sampleWorkReq,
      monday_item_id: "123456",
    });

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
      .mockResolvedValueOnce(updateResult(1)) // UPDATE work_reqs
      .mockResolvedValueOnce(deleteResult(1)); // DELETE from queue

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
      .mockResolvedValueOnce(selectResult([queueRow])) // SELECT
      .mockResolvedValueOnce(updateResult(1)); // UPDATE queue

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

// ---------------------------------------------------------------------------
// Phase 4.4 — loop-prevention signatures on outbound pushes
// ---------------------------------------------------------------------------

const richWorkReq = {
  id: 100,
  referenceNumber: "WR-2026-0100",
  account: "Signature Test Account",
  accountContact: "Jane Doe",
  actionRequired: "Replace plant",
  numberOfPlants: 4,
  notes: "Bring keys",
  dueDate: "2026-05-01",
  monday_item_id: "777888999",
};

describe("Phase 4.4 — loop prevention on outbound success", () => {
  it("remembers a signature for every non-null field after pushCreate succeeds", async () => {
    mondayClient.createItem.mockResolvedValue("777888999");
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushCreate(richWorkReq);

    // Six non-null synced fields on richWorkReq: account, accountContact,
    // actionRequired, numberOfPlants, notes, dueDate. referenceNumber is
    // stored as the Monday item name, not as a mapped column, so it's
    // not in FIELD_MAP.
    expect(loopPrevention.size()).toBe(6);
  });

  it("does NOT remember signatures when pushCreate fails (mondayClient throws)", async () => {
    mondayClient.createItem.mockRejectedValue(new Error("Monday down"));
    db.query.mockResolvedValue(insertResult(1));

    await syncService.pushCreate(richWorkReq);

    expect(loopPrevention.size()).toBe(0);
  });

  it("remembers signatures after pushUpdate succeeds", async () => {
    mondayClient.updateItem.mockResolvedValue();
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushUpdate(richWorkReq);

    expect(loopPrevention.size()).toBe(6);
  });

  it("remembers the delete sentinel signature after pushDelete succeeds", async () => {
    mondayClient.deleteItem.mockResolvedValue();

    await syncService.pushDelete({
      ...richWorkReq,
      monday_item_id: "777888999",
    });

    // One signature — the sentinel __delete__ columnId with null value.
    expect(loopPrevention.size()).toBe(1);
  });

  it("does NOT remember a delete signature when pushDelete fails", async () => {
    mondayClient.deleteItem.mockRejectedValue(new Error("network"));
    db.query.mockResolvedValue(insertResult(1));

    await syncService.pushDelete({
      ...richWorkReq,
      monday_item_id: "777888999",
    });

    expect(loopPrevention.size()).toBe(0);
  });
});

describe("Phase 4.4 — round-trip echo suppression", () => {
  it("inbound handler skips the DB update for an echo of a pushUpdate", async () => {
    // 1. Outbound: Greenery pushes an update to Monday.
    mondayClient.updateItem.mockResolvedValue();
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushUpdate(richWorkReq);

    // Record the number of db.query calls so far (1 for the pushUpdate
    // success UPDATE work_reqs SET monday_synced_at).
    const dbCallsAfterPush = db.query.mock.calls.length;

    // 2. Simulate Monday's webhook echoing the same change back. Build
    //    an inbound event matching one of the fields we just pushed.
    const echoEvent = {
      type: "update_column_value",
      pulseId: Number(richWorkReq.monday_item_id),
      columnId: "text_mm2ahm04", // account column
      columnType: "text",
      value: { value: "Signature Test Account" }, // same as richWorkReq.account
    };

    // 3. Inbound: handler should recognize this as an echo and skip the
    //    DB update entirely.
    await handler.handleEvent(echoEvent);

    expect(db.query.mock.calls.length).toBe(dbCallsAfterPush);
  });

  it("inbound handler STILL applies a genuine change not matching any echo", async () => {
    // Outbound succeeds for the rich work req (account = "Signature Test Account")
    mondayClient.updateItem.mockResolvedValue();
    db.query.mockResolvedValue(updateResult(1));

    await syncService.pushUpdate(richWorkReq);
    const dbCallsAfterPush = db.query.mock.calls.length;

    // A genuine user edit comes in with a DIFFERENT value — no matching
    // signature in the prevention set.
    const genuineEdit = {
      type: "update_column_value",
      pulseId: Number(richWorkReq.monday_item_id),
      columnId: "text_mm2ahm04",
      columnType: "text",
      value: { value: "A Different Account Name" },
    };

    await handler.handleEvent(genuineEdit);

    // Handler should have issued exactly one new UPDATE to work_reqs.
    expect(db.query.mock.calls.length).toBe(dbCallsAfterPush + 1);
    const lastCall = db.query.mock.calls[db.query.mock.calls.length - 1];
    expect(lastCall[0]).toMatch(/UPDATE work_reqs SET account = \?/);
    expect(lastCall[1][0]).toBe("A Different Account Name");
  });

  it("inbound delete handler skips when pushDelete already primed the signature", async () => {
    mondayClient.deleteItem.mockResolvedValue();

    await syncService.pushDelete({ ...richWorkReq });
    const dbCallsAfterPush = db.query.mock.calls.length;

    await handler.handleEvent({
      type: "delete_pulse",
      itemId: Number(richWorkReq.monday_item_id),
    });

    // No new DB call — handler short-circuited on the delete sentinel signature.
    expect(db.query.mock.calls.length).toBe(dbCallsAfterPush);
  });
});
