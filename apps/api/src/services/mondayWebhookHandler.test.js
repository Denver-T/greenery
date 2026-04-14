jest.mock("../db");
jest.mock("../lib/env", () => ({
  MONDAY_API_TOKEN: "test-token",
  MONDAY_BOARD_ID: "8887438729",
  MONDAY_API_VERSION: "2024-10",
}));

const db = require("../db");
const loopPrevention = require("../utils/loopPreventionSet");
const {
  updateResult,
  deleteResult,
} = require("../test/mockDb");

const {
  handleEvent,
  handleUpdateColumnValue,
  handleDeletePulse,
  handleCreatePulse,
  decodeWebhookValue,
  resolveItemId,
  DECODE_UNSUPPORTED,
} = require("./mondayWebhookHandler");

const ITEM_ID = 11729244228;
const ACCOUNT_COLUMN = "text_mm2ahm04"; // account → Monday columnId
const NOTES_COLUMN = "long_text_mm2ajdep"; // notes → Monday columnId
const DUE_DATE_COLUMN = "date4"; // dueDate → Monday columnId
const NUM_PLANTS_COLUMN = "numeric_mm2aqtnt"; // numberOfPlants → Monday columnId

beforeEach(() => {
  jest.clearAllMocks();
  loopPrevention.clear();
});

afterAll(() => {
  loopPrevention.clear();
});

describe("resolveItemId", () => {
  it("prefers pulseId when present", () => {
    expect(resolveItemId({ pulseId: 1, itemId: 2 })).toBe(1);
  });

  it("falls back to itemId when pulseId is missing", () => {
    expect(resolveItemId({ itemId: 42 })).toBe(42);
  });

  it("returns null when neither is set", () => {
    expect(resolveItemId({})).toBe(null);
  });
});

describe("decodeWebhookValue", () => {
  it("extracts short text from {value: string} shape", () => {
    expect(decodeWebhookValue({ value: "Green Corp" }, "text")).toBe(
      "Green Corp",
    );
  });

  it("extracts short text from {text: string} shape (fallback)", () => {
    expect(decodeWebhookValue({ text: "Green Corp" }, "text")).toBe(
      "Green Corp",
    );
  });

  it("extracts long_text from {text: string} shape", () => {
    expect(
      decodeWebhookValue({ text: "Detailed notes here" }, "long_text"),
    ).toBe("Detailed notes here");
  });

  it("returns the value directly when it's already a string", () => {
    expect(decodeWebhookValue("plain", "text")).toBe("plain");
  });

  it("decodes numbers from {value: '42'} shape", () => {
    expect(decodeWebhookValue({ value: "42" }, "numbers")).toBe(42);
  });

  it("decodes numbers from a bare numeric primitive", () => {
    expect(decodeWebhookValue(42, "numbers")).toBe(42);
  });

  it("returns null for invalid numeric values", () => {
    expect(decodeWebhookValue({ value: "not a number" }, "numbers")).toBe(null);
  });

  it("decodes dates from {date: 'YYYY-MM-DD'} shape", () => {
    expect(decodeWebhookValue({ date: "2026-04-20" }, "date")).toBe(
      "2026-04-20",
    );
  });

  it("trims date strings to 10 chars (YYYY-MM-DD)", () => {
    expect(
      decodeWebhookValue({ date: "2026-04-20T00:00:00Z" }, "date"),
    ).toBe("2026-04-20");
  });

  it("returns null for null value regardless of column type", () => {
    expect(decodeWebhookValue(null, "text")).toBe(null);
    expect(decodeWebhookValue(null, "numbers")).toBe(null);
    expect(decodeWebhookValue(null, "date")).toBe(null);
  });

  it("returns the UNSUPPORTED sentinel (NOT null) for unknown column types", () => {
    // Regression: previously this returned null, which the handler wrote
    // to the DB as a silent field clear. Now it returns a sentinel the
    // handler must check for before applying the write.
    expect(decodeWebhookValue({ value: "x" }, "color")).toBe(DECODE_UNSUPPORTED);
    expect(decodeWebhookValue({ value: "x" }, "board-relation")).toBe(
      DECODE_UNSUPPORTED,
    );
  });

  it("routes long-text (hyphen) to the same case as long_text (underscore)", () => {
    // Regression for Phase 4 Path B e2e — Monday sends `long-text` in
    // webhook bodies, not `long_text`. Before normalization the case
    // fell through to default and the handler silently cleared notes.
    expect(
      decodeWebhookValue(
        { text: "Path B edit test", changed_at: "2026-04-13T18:55:35.282Z" },
        "long-text",
      ),
    ).toBe("Path B edit test");
  });

  it("routes numeric (webhook form) to the same case as numbers (graphql form)", () => {
    // Regression for Phase 4 Path B e2e — Monday sends `numeric` in
    // webhook bodies for the number column, not `numbers`. The two
    // forms must route to the same decoder or numberOfPlants edits
    // on the Monday board silently clear the DB column.
    expect(decodeWebhookValue({ value: "7" }, "numeric")).toBe(7);
    expect(decodeWebhookValue(7, "numeric")).toBe(7);
    expect(decodeWebhookValue({ value: "not-a-number" }, "numeric")).toBe(null);
  });

  it("normalization treats null and undefined columnType as unsupported", () => {
    expect(decodeWebhookValue({ text: "x" }, null)).toBe(DECODE_UNSUPPORTED);
    expect(decodeWebhookValue({ text: "x" }, undefined)).toBe(
      DECODE_UNSUPPORTED,
    );
  });
});

describe("handleEvent dispatcher", () => {
  it("dispatches update_column_value to the column-change handler", async () => {
    db.query.mockResolvedValue(updateResult(1));
    await handleEvent({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: ACCOUNT_COLUMN,
      columnType: "text",
      value: { value: "New Account" },
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE work_reqs SET account = \?/);
    expect(params).toEqual(["New Account", String(ITEM_ID)]);
  });

  it("dispatches delete_pulse to the delete handler", async () => {
    db.query.mockResolvedValue(deleteResult(1));
    await handleEvent({
      type: "delete_pulse",
      itemId: ITEM_ID,
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM work_reqs/);
    expect(params).toEqual([String(ITEM_ID)]);
  });

  it("logs and ignores create_pulse (v1 behavior)", async () => {
    await handleEvent({
      type: "create_pulse",
      pulseId: ITEM_ID,
      pulseName: "new-item-from-monday",
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("logs and ignores unknown event types", async () => {
    await handleEvent({
      type: "item_archived",
      pulseId: ITEM_ID,
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("safely ignores events with no body", async () => {
    await handleEvent(undefined);
    await handleEvent(null);
    await handleEvent("");

    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("handleUpdateColumnValue", () => {
  it("runs an UPDATE with the decoded value for a mapped column", async () => {
    db.query.mockResolvedValue(updateResult(1));
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: NOTES_COLUMN,
      columnType: "long_text",
      value: { text: "Bring keys to the back door" },
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE work_reqs SET notes = \?/);
    expect(params[0]).toBe("Bring keys to the back door");
    expect(params[1]).toBe(String(ITEM_ID));
  });

  it("handles numbers columns", async () => {
    db.query.mockResolvedValue(updateResult(1));
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: NUM_PLANTS_COLUMN,
      columnType: "numbers",
      value: { value: "7" },
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE work_reqs SET numberOfPlants = \?/);
    expect(params[0]).toBe(7);
  });

  it("handles date columns", async () => {
    db.query.mockResolvedValue(updateResult(1));
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: DUE_DATE_COLUMN,
      columnType: "date",
      value: { date: "2026-04-30" },
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE work_reqs SET dueDate = \?/);
    expect(params[0]).toBe("2026-04-30");
  });

  it("handles long-text (hyphen) end-to-end through the handler", async () => {
    // Regression for Phase 4 Path B e2e — before the fix this webhook
    // shape fell into the default case, decodeWebhookValue returned
    // null, and the handler dutifully wrote NULL to work_reqs.notes,
    // silently clearing production data on every long_text edit.
    db.query.mockResolvedValue(updateResult(1));
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: NOTES_COLUMN,
      columnType: "long-text",
      value: {
        text: "Path B edit test",
        changed_at: "2026-04-13T18:55:35.282Z",
      },
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE work_reqs SET notes = \?/);
    expect(params[0]).toBe("Path B edit test");
  });

  it("skips the UPDATE when decoder returns the UNSUPPORTED sentinel", async () => {
    // Defense-in-depth: if Monday someday adds a new column type or
    // renames one we do use, the handler must NOT silently clear the
    // field by writing null. It must refuse the write and log loudly.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: NOTES_COLUMN, // a mapped column — gets past the whitelist
      columnType: "some-future-type-we-do-not-handle",
      value: { text: "would-be-cleared" },
    });

    expect(db.query).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/skipping, decoder does not support/),
    );
    warnSpy.mockRestore();
  });

  it("skips events whose columnId is not in COLUMN_TO_FIELD", async () => {
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: "status", // Monday-native column we don't sync
      columnType: "color",
      value: { label: { text: "Done" } },
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips events with missing itemId", async () => {
    await handleUpdateColumnValue({
      type: "update_column_value",
      columnId: ACCOUNT_COLUMN,
      columnType: "text",
      value: { value: "x" },
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips events with missing columnId", async () => {
    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      value: { value: "x" },
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips echoes flagged by loopPreventionSet (signature uses decoded scalar)", async () => {
    // The signature must be computed from the CANONICAL scalar, not the raw
    // Monday webhook shape — the outbound side in mondaySyncService remembers
    // signatures from the DB value (a plain string), and the inbound handler
    // must produce the same hash.
    const signature = loopPrevention.computeSignature(
      ITEM_ID,
      ACCOUNT_COLUMN,
      "Green Corp",
    );
    loopPrevention.remember(signature);

    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: ITEM_ID,
      columnId: ACCOUNT_COLUMN,
      columnType: "text",
      value: { value: "Green Corp" },
    });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("logs a warning when the UPDATE matches zero rows", async () => {
    db.query.mockResolvedValue(updateResult(0));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await handleUpdateColumnValue({
      type: "update_column_value",
      pulseId: 99999999999,
      columnId: ACCOUNT_COLUMN,
      columnType: "text",
      value: { value: "Ghost Account" },
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("accepts itemId instead of pulseId", async () => {
    db.query.mockResolvedValue(updateResult(1));
    await handleUpdateColumnValue({
      type: "update_column_value",
      itemId: ITEM_ID, // note: itemId not pulseId
      columnId: ACCOUNT_COLUMN,
      columnType: "text",
      value: { value: "X" },
    });

    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe("handleDeletePulse", () => {
  it("runs a DELETE against work_reqs", async () => {
    db.query.mockResolvedValue(deleteResult(1));
    await handleDeletePulse({
      type: "delete_pulse",
      itemId: ITEM_ID,
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM work_reqs WHERE monday_item_id = \?/);
    expect(params).toEqual([String(ITEM_ID)]);
  });

  it("skips when itemId is missing", async () => {
    await handleDeletePulse({ type: "delete_pulse" });
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips echoes flagged by loopPreventionSet", async () => {
    const signature = loopPrevention.computeSignature(
      ITEM_ID,
      "__delete__",
      null,
    );
    loopPrevention.remember(signature);

    await handleDeletePulse({ type: "delete_pulse", itemId: ITEM_ID });

    expect(db.query).not.toHaveBeenCalled();
  });

  it("logs a warning when DELETE matches zero rows", async () => {
    db.query.mockResolvedValue(deleteResult(0));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await handleDeletePulse({ type: "delete_pulse", itemId: 99999999999 });

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("handleCreatePulse", () => {
  it("is a no-op — never touches the database", () => {
    handleCreatePulse({
      type: "create_pulse",
      pulseId: ITEM_ID,
      pulseName: "Manual board entry",
    });

    expect(db.query).not.toHaveBeenCalled();
  });
});
