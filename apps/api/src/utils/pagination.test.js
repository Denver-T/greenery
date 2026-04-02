const { parsePagination, paginatedResponse } = require("./pagination");

describe("parsePagination", () => {
  it("returns null when no page or pageSize params are present", () => {
    expect(parsePagination({})).toBeNull();
    expect(parsePagination({ scope: "assignment" })).toBeNull();
  });

  it("parses page and pageSize from query strings", () => {
    const result = parsePagination({ page: "2", pageSize: "10" });

    expect(result).toEqual({ page: 2, pageSize: 10, offset: 10 });
  });

  it("defaults pageSize to 25 when only page is provided", () => {
    const result = parsePagination({ page: "1" });

    expect(result).toEqual({ page: 1, pageSize: 25, offset: 0 });
  });

  it("clamps page to minimum of 1", () => {
    expect(parsePagination({ page: "0" }).page).toBe(1);
    expect(parsePagination({ page: "-5" }).page).toBe(1);
  });

  it("clamps pageSize to maximum of 100", () => {
    expect(parsePagination({ page: "1", pageSize: "200" }).pageSize).toBe(100);
  });

  it("falls back to default for zero or negative pageSize", () => {
    expect(parsePagination({ page: "1", pageSize: "0" }).pageSize).toBe(25);
    expect(parsePagination({ page: "1", pageSize: "-10" }).pageSize).toBe(1);
  });

  it("handles non-numeric strings gracefully", () => {
    const result = parsePagination({ page: "abc" });

    expect(result).toEqual({ page: 1, pageSize: 25, offset: 0 });
  });

  it("calculates offset correctly", () => {
    expect(parsePagination({ page: "3", pageSize: "10" }).offset).toBe(20);
    expect(parsePagination({ page: "1", pageSize: "50" }).offset).toBe(0);
  });

  it("respects custom default pageSize", () => {
    const result = parsePagination({ page: "1" }, { pageSize: 50 });

    expect(result.pageSize).toBe(50);
  });
});

describe("paginatedResponse", () => {
  it("wraps rows with pagination metadata", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(rows, 100, 2, 25);

    expect(result).toEqual({
      data: rows,
      page: 2,
      pageSize: 25,
      totalCount: 100,
    });
  });
});
