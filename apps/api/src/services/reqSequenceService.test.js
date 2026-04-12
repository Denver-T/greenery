jest.mock("../db");

const db = require("../db");
const { nextReferenceNumber } = require("./reqSequenceService");

// Mock a pooled connection that db.getConnection() returns.
// The test simulates LAST_INSERT_ID session-local behavior by giving each
// mock connection its own local state.
function createMockConnection(sessionState = { lastInsertId: 0 }) {
  return {
    query: jest.fn(async (sql) => {
      if (sql.includes("INSERT INTO work_req_sequences")) {
        // If session was 0 (fresh insert), stays 0.
        // If ON DUPLICATE KEY fires, caller sets it via the test setup.
        return [{ affectedRows: 1 }, undefined];
      }
      if (sql.includes("SELECT LAST_INSERT_ID()")) {
        return [[{ seq: sessionState.lastInsertId }], []];
      }
      return [[], []];
    }),
    release: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("reqSequenceService", () => {
  describe("nextReferenceNumber", () => {
    it("returns WR-YYYY-0001 format on first call of the year", async () => {
      // Fresh insert: session LAST_INSERT_ID is 0 (no ODKU branch fired)
      const conn = createMockConnection({ lastInsertId: 0 });
      db.getConnection.mockResolvedValue(conn);

      const ref = await nextReferenceNumber();
      const year = new Date().getFullYear();

      expect(ref).toBe(`WR-${year}-0001`);
      expect(conn.query).toHaveBeenCalledTimes(2);
      expect(conn.query.mock.calls[0][0]).toContain(
        "INSERT INTO work_req_sequences",
      );
      expect(conn.query.mock.calls[0][1]).toEqual([year]);
      expect(conn.release).toHaveBeenCalledTimes(1);
    });

    it("returns sequential numbers on subsequent calls", async () => {
      // ODKU fired: LAST_INSERT_ID(next_seq + 1) set session state to 5
      const conn = createMockConnection({ lastInsertId: 5 });
      db.getConnection.mockResolvedValue(conn);

      const ref = await nextReferenceNumber();
      const year = new Date().getFullYear();

      expect(ref).toBe(`WR-${year}-0005`);
    });

    it("pads sequence numbers to 4 digits", async () => {
      const conn = createMockConnection({ lastInsertId: 42 });
      db.getConnection.mockResolvedValue(conn);

      const ref = await nextReferenceNumber();
      expect(ref).toMatch(/^WR-\d{4}-0042$/);
    });

    it("handles sequence numbers beyond 9999", async () => {
      const conn = createMockConnection({ lastInsertId: 10001 });
      db.getConnection.mockResolvedValue(conn);

      const ref = await nextReferenceNumber();
      const year = new Date().getFullYear();
      expect(ref).toBe(`WR-${year}-10001`);
    });

    it("releases the connection even if the query fails", async () => {
      const conn = {
        query: jest.fn().mockRejectedValue(new Error("Connection lost")),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValue(conn);

      await expect(nextReferenceNumber()).rejects.toThrow("Connection lost");
      expect(conn.release).toHaveBeenCalledTimes(1);
    });

    it("produces unique references across 20 concurrent calls on dedicated connections", async () => {
      // Each call gets its own connection with its own session state — this
      // mirrors how mysql2 pool.getConnection() works in production.
      let counter = 0;
      db.getConnection.mockImplementation(async () => {
        counter += 1;
        return createMockConnection({ lastInsertId: counter });
      });

      const results = await Promise.all(
        Array.from({ length: 20 }, () => nextReferenceNumber()),
      );

      const unique = new Set(results);
      expect(unique.size).toBe(20);

      for (const ref of results) {
        expect(ref).toMatch(/^WR-\d{4}-\d{4,}$/);
      }
    });
  });
});
