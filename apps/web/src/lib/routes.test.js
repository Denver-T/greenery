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
});
