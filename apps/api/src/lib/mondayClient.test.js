jest.mock("./env", () => ({
  MONDAY_API_TOKEN: "test-token",
  MONDAY_API_VERSION: "2024-10",
}));

const mondayClient = require("./mondayClient");

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mondayClient", () => {
  describe("call", () => {
    it("sends correct headers and body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { boards: [] } }),
      });

      await mondayClient.call("query { boards { id } }");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.monday.com/v2",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "test-token",
            "API-Version": "2024-10",
          },
        }),
      );
    });

    it("returns data on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { boards: [{ id: "1" }] } }),
      });

      const data = await mondayClient.call("query { boards { id } }");
      expect(data.boards[0].id).toBe("1");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            errors: [{ message: "Not authenticated" }],
          }),
      });

      await expect(mondayClient.call("query {}")).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("throws on GraphQL errors in 200 response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            errors: [{ message: "Invalid column id" }],
          }),
      });

      await expect(mondayClient.call("mutation {}")).rejects.toThrow(
        "Invalid column id",
      );
    });
  });

  describe("createItem", () => {
    it("returns the new item ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { create_item: { id: "123456" } } }),
      });

      const id = await mondayClient.createItem("999", "Test Item", {
        text0: "hello",
      });
      expect(id).toBe("123456");
    });
  });

  describe("updateItem", () => {
    it("sends mutation with column values", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { change_multiple_column_values: { id: "123" } },
          }),
      });

      await expect(
        mondayClient.updateItem("999", "123", { text0: "updated" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("deleteItem", () => {
    it("sends delete mutation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { delete_item: { id: "123" } } }),
      });

      await expect(
        mondayClient.deleteItem("123"),
      ).resolves.toBeUndefined();
    });
  });
});
