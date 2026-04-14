const {
  TTL_MS,
  MAX_ENTRIES,
  computeSignature,
  hashValue,
  stableStringify,
  remember,
  has,
  size,
  clear,
} = require("./loopPreventionSet");

describe("loopPreventionSet", () => {
  beforeEach(() => {
    clear();
    jest.useRealTimers();
  });

  afterAll(() => {
    clear();
    jest.useRealTimers();
  });

  describe("stableStringify", () => {
    it("serializes primitives the same as JSON.stringify", () => {
      expect(stableStringify("hello")).toBe('"hello"');
      expect(stableStringify(42)).toBe("42");
      expect(stableStringify(true)).toBe("true");
      expect(stableStringify(null)).toBe("null");
    });

    it("serializes undefined as JSON does (returns undefined)", () => {
      expect(stableStringify(undefined)).toBe(undefined);
    });

    it("produces identical output for objects with different key order", () => {
      const a = { foo: 1, bar: 2, baz: 3 };
      const b = { baz: 3, foo: 1, bar: 2 };
      expect(stableStringify(a)).toBe(stableStringify(b));
    });

    it("handles nested objects with stable ordering", () => {
      const a = { outer: { b: 2, a: 1 }, other: 3 };
      const b = { other: 3, outer: { a: 1, b: 2 } };
      expect(stableStringify(a)).toBe(stableStringify(b));
    });

    it("preserves array order", () => {
      expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
      expect(stableStringify([3, 1, 2])).not.toBe(stableStringify([1, 2, 3]));
    });
  });

  describe("hashValue", () => {
    it("returns a 16-character hex string", () => {
      const result = hashValue({ any: "value" });
      expect(result).toMatch(/^[0-9a-f]{16}$/);
    });

    it("is deterministic for the same input", () => {
      expect(hashValue({ a: 1 })).toBe(hashValue({ a: 1 }));
    });

    it("is stable across key ordering", () => {
      expect(hashValue({ a: 1, b: 2 })).toBe(hashValue({ b: 2, a: 1 }));
    });

    it("produces different hashes for different inputs", () => {
      expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }));
    });

    it("handles null, primitives, and nested shapes", () => {
      expect(hashValue(null)).toMatch(/^[0-9a-f]{16}$/);
      expect(hashValue("string")).toMatch(/^[0-9a-f]{16}$/);
      expect(hashValue({ nested: { a: [1, 2] } })).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe("computeSignature", () => {
    it("produces the same signature for equal inputs", () => {
      const s1 = computeSignature(123, "status", { label: "done" });
      const s2 = computeSignature(123, "status", { label: "done" });
      expect(s1).toBe(s2);
    });

    it("produces different signatures for different item ids", () => {
      expect(computeSignature(1, "status", { label: "a" })).not.toBe(
        computeSignature(2, "status", { label: "a" }),
      );
    });

    it("produces different signatures for different column ids", () => {
      expect(computeSignature(1, "status", { label: "a" })).not.toBe(
        computeSignature(1, "notes", { label: "a" }),
      );
    });

    it("produces different signatures for different values", () => {
      expect(computeSignature(1, "status", { label: "a" })).not.toBe(
        computeSignature(1, "status", { label: "b" }),
      );
    });

    it("is stable regardless of value object key order", () => {
      const s1 = computeSignature(1, "col", { foo: 1, bar: 2 });
      const s2 = computeSignature(1, "col", { bar: 2, foo: 1 });
      expect(s1).toBe(s2);
    });

    it("treats numeric and string item ids as equal", () => {
      expect(computeSignature(42, "col", "v")).toBe(
        computeSignature("42", "col", "v"),
      );
    });
  });

  describe("remember and has", () => {
    it("has returns false for a signature that was never remembered", () => {
      expect(has("never-seen")).toBe(false);
    });

    it("has returns true immediately after remember", () => {
      const sig = computeSignature(1, "status", "value");
      remember(sig);
      expect(has(sig)).toBe(true);
    });

    it("has returns true repeatedly within the TTL window", () => {
      const sig = "test-sig";
      remember(sig);
      expect(has(sig)).toBe(true);
      expect(has(sig)).toBe(true);
      expect(has(sig)).toBe(true);
    });

    it("has returns false after the TTL expires and prunes the entry", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-04-12T00:00:00Z").getTime());

      const sig = "expires-soon";
      remember(sig);
      expect(has(sig)).toBe(true);

      // Advance past the TTL window.
      jest.setSystemTime(new Date("2026-04-12T00:00:15.001Z").getTime());
      expect(has(sig)).toBe(false);

      // Entry should have been pruned by the has() call above.
      expect(size()).toBe(0);
    });

    it("remembers TTL_MS is exactly 15 seconds (regression)", () => {
      expect(TTL_MS).toBe(15_000);
    });

    it("supports multiple distinct signatures independently", () => {
      remember("sig-a");
      remember("sig-b");
      expect(has("sig-a")).toBe(true);
      expect(has("sig-b")).toBe(true);
      expect(has("sig-c")).toBe(false);
    });
  });

  describe("size cap (MAX_ENTRIES)", () => {
    it("exposes MAX_ENTRIES as 10_000", () => {
      expect(MAX_ENTRIES).toBe(10_000);
    });

    it("never exceeds MAX_ENTRIES under heavy write load", () => {
      // Remember 10_050 entries — 50 over the cap.
      for (let i = 0; i < 10_050; i += 1) {
        remember(`sig-${i}`);
      }
      expect(size()).toBeLessThanOrEqual(MAX_ENTRIES);
    });

    it("evicts the oldest entries when full with all-fresh signatures", () => {
      // Fill to cap with easily-identifiable signatures.
      for (let i = 0; i < MAX_ENTRIES; i += 1) {
        remember(`sig-${i}`);
      }
      expect(has("sig-0")).toBe(true);

      // Add one more — oldest (sig-0) should be evicted.
      remember("sig-new");
      expect(has("sig-0")).toBe(false);
      expect(has("sig-new")).toBe(true);
    });

    it("prunes expired entries before evicting on remember", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-04-12T00:00:00Z").getTime());

      // Fill to cap — all entries will expire at the same time.
      for (let i = 0; i < MAX_ENTRIES; i += 1) {
        remember(`old-${i}`);
      }

      // Advance past TTL so every existing entry is expired.
      jest.setSystemTime(new Date("2026-04-12T00:00:20Z").getTime());

      // New remember() should prune all expired first; no eviction needed.
      remember("fresh");
      expect(size()).toBe(1);
      expect(has("fresh")).toBe(true);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      remember("a");
      remember("b");
      remember("c");
      expect(size()).toBe(3);
      clear();
      expect(size()).toBe(0);
      expect(has("a")).toBe(false);
    });
  });
});
