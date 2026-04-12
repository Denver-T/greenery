import { describe, it, expect } from "vitest";

import { getTopBarTitle, ROUTES } from "./routes";

describe("getTopBarTitle", () => {
  it("returns the exact title for a known root path", () => {
    expect(getTopBarTitle("/dashboard")).toBe("Dashboard Analytics");
  });

  it("returns the exact title for every route in ROUTES", () => {
    for (const route of ROUTES) {
      expect(getTopBarTitle(route.href)).toBe(route.topBarTitle);
    }
  });

  it("falls back to 'Greenery' for an unknown path", () => {
    expect(getTopBarTitle("/nope")).toBe("Greenery");
  });

  it("falls back to 'Greenery' when pathname is undefined or empty", () => {
    expect(getTopBarTitle(undefined)).toBe("Greenery");
    expect(getTopBarTitle("")).toBe("Greenery");
  });

  it("matches nested paths via the '/' suffix guard", () => {
    expect(getTopBarTitle("/dashboard/whatever")).toBe("Dashboard Analytics");
  });

  it("does NOT match prefix collisions (e.g. /req must not match /reqs)", () => {
    expect(getTopBarTitle("/reqs")).toBe("Greenery");
  });

  it("resolves dynamic detail route /req/:id to detail title", () => {
    expect(getTopBarTitle("/req/42")).toBe("Work Request Detail");
    expect(getTopBarTitle("/req/1")).toBe("Work Request Detail");
  });

  it("resolves dynamic edit route /req/:id/edit to edit title", () => {
    expect(getTopBarTitle("/req/42/edit")).toBe("Edit Work Request");
  });

  it("dynamic routes are checked before /req prefix match", () => {
    // /req/42 must NOT fall through to the /req entry's "Create Work REQ" title
    expect(getTopBarTitle("/req/42")).not.toBe("Create Work REQ");
  });

  it("/req/list still maps to its explicit entry", () => {
    expect(getTopBarTitle("/req/list")).toBe("Work Request Directory");
  });
});
