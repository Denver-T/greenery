const {
  toMondayColumnValues,
  fromMondayColumnValues,
  fromWebhookPayload,
  FIELD_MAP,
} = require("./mondayColumnValues");

describe("mondayColumnValues", () => {
  const sampleWorkReq = {
    referenceNumber: "WR-2026-0001",
    requestDate: "2026-04-12",
    techName: "Jane Doe",
    account: "Green Corp",
    accountContact: "John Smith",
    accountAddress: "123 Main St",
    actionRequired: "Replace fern",
    numberOfPlants: 3,
    plantWanted: "Fern",
    plantReplaced: "Spider Plant",
    plantSize: "Medium",
    plantHeight: "2ft",
    planterTypeSize: "Round 10in",
    planterColour: "Terracotta",
    stagingMaterial: "Moss",
    lighting: "Low",
    method: "Direct replacement",
    location: "Lobby",
    notes: "Customer prefers green planter",
    dueDate: "2026-04-20",
    status: "assigned",
  };

  describe("toMondayColumnValues", () => {
    it("maps all 20 synced fields to Monday column IDs", () => {
      const cv = toMondayColumnValues(sampleWorkReq);

      // Text fields are plain strings
      expect(cv.text_mm2amsvb).toBe("Jane Doe");
      expect(cv.text_mm2ahm04).toBe("Green Corp");

      // Long text fields are {text: "..."}
      expect(cv.long_text_mm2aqvxj).toEqual({ text: "123 Main St" });
      expect(cv.long_text_mm2a1ckm).toEqual({ text: "Replace fern" });

      // Numbers are stringified
      expect(cv.numeric_mm2aqtnt).toBe("3");

      // Dates are {date: "YYYY-MM-DD"}
      expect(cv.date_mm2aq9wj).toEqual({ date: "2026-04-12" });
      expect(cv.date4).toEqual({ date: "2026-04-20" });

      // Status as text
      expect(cv.text_mm2ae3s9).toBe("assigned");
    });

    it("skips null and undefined fields", () => {
      const cv = toMondayColumnValues({ account: "Test", plantWanted: null });
      expect(cv.text_mm2ahm04).toBe("Test");
      expect(cv.text_mm2asd86).toBeUndefined();
    });
  });

  describe("fromMondayColumnValues", () => {
    it("maps Monday column array back to Greenery fields", () => {
      const mondayColumns = [
        { id: "text_mm2ahm04", text: "Green Corp" },
        { id: "long_text_mm2a1ckm", text: "Replace fern" },
        { id: "numeric_mm2aqtnt", text: "3" },
        { id: "date_mm2aq9wj", text: "2026-04-12" },
        { id: "text_mm2ae3s9", text: "assigned" },
      ];

      const result = fromMondayColumnValues(mondayColumns);

      expect(result.account).toBe("Green Corp");
      expect(result.actionRequired).toBe("Replace fern");
      expect(result.numberOfPlants).toBe(3);
      expect(result.requestDate).toBe("2026-04-12");
      expect(result.status).toBe("assigned");
    });

    it("ignores unknown column IDs", () => {
      const result = fromMondayColumnValues([
        { id: "unknown_col", text: "ignored" },
      ]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("round-trip", () => {
    it("preserves data through toMonday → fromMonday cycle", () => {
      const cv = toMondayColumnValues(sampleWorkReq);

      // Simulate Monday's column_values response shape
      const mondayColumns = Object.entries(cv).map(([id, val]) => ({
        id,
        text: typeof val === "object" ? (val.date || val.text) : val,
      }));

      const roundTripped = fromMondayColumnValues(mondayColumns);

      // All synced fields should survive the round-trip
      for (const field of Object.keys(FIELD_MAP)) {
        if (sampleWorkReq[field] === undefined || sampleWorkReq[field] === null) continue;

        const expected =
          typeof sampleWorkReq[field] === "number"
            ? sampleWorkReq[field]
            : String(sampleWorkReq[field]);

        expect(roundTripped[field]).toEqual(expected);
      }
    });
  });

  describe("fromWebhookPayload", () => {
    it("extracts field info from a column change event", () => {
      const result = fromWebhookPayload({
        pulseId: 123456,
        columnId: "text_mm2ahm04",
        value: { value: "New Account" },
      });

      expect(result.mondayItemId).toBe("123456");
      expect(result.field).toBe("account");
      expect(result.columnId).toBe("text_mm2ahm04");
    });

    it("returns null for unknown column IDs", () => {
      const result = fromWebhookPayload({
        pulseId: 123,
        columnId: "unknown_col",
        value: {},
      });
      expect(result).toBeNull();
    });

    it("handles delete events with no columnId", () => {
      const result = fromWebhookPayload({ pulseId: 123 });
      expect(result.mondayItemId).toBe("123");
      expect(result.field).toBeNull();
    });

    it("returns null when no item ID present", () => {
      const result = fromWebhookPayload({});
      expect(result).toBeNull();
    });
  });
});
