jest.mock("../db");

const db = require("../db");
const plantService = require("./plantService");
const { plantGroupRow } = require("../test/factories");
const { selectResult, insertResult, deleteResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getPlants", () => {
  it("returns all plants ordered by created_at DESC", async () => {
    const rows = [plantGroupRow(), plantGroupRow({ id: 2, name: "Pothos" })];
    db.query.mockResolvedValue(selectResult(rows));

    const result = await plantService.getPlants();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Fern");
    expect(result[1].name).toBe("Pothos");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM plants ORDER BY"),
    );
  });

  it("returns an empty array when no plants exist", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await plantService.getPlants();

    expect(result).toEqual([]);
  });
});

describe("getPlantsPaginated", () => {
  it("returns rows and totalCount", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ total: 10 }]))
      .mockResolvedValueOnce(selectResult([plantGroupRow()]));

    const result = await plantService.getPlantsPaginated(25, 0);

    expect(result.totalCount).toBe(10);
    expect(result.rows).toHaveLength(1);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("returns empty rows and zero totalCount when no plants exist", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ total: 0 }]))
      .mockResolvedValueOnce(selectResult([]));

    const result = await plantService.getPlantsPaginated(25, 0);

    expect(result.totalCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});

describe("getPlantById", () => {
  it("returns the plant when found", async () => {
    const plant = plantGroupRow({ id: 5 });
    db.query.mockResolvedValue(selectResult([plant]));

    const result = await plantService.getPlantById(5);

    expect(result.id).toBe(5);
    expect(result.name).toBe("Fern");
  });

  it("returns null when the plant is not found", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await plantService.getPlantById(999);

    expect(result).toBeNull();
  });
});

describe("createPlant", () => {
  it("inserts a plant with the given quantity", async () => {
    const created = plantGroupRow({ id: 10 });
    db.query
      .mockResolvedValueOnce(insertResult(10))
      .mockResolvedValueOnce(selectResult([created]));

    const result = await plantService.createPlant({
      name: "Fern",
      location: "Lobby",
      imageUrl: null,
      costPerUnit: "12.50",
      quantity: 3,
    });

    expect(result.id).toBe(10);
    const insertCall = db.query.mock.calls[0];
    expect(insertCall[0]).toContain("INSERT INTO plants");
    expect(insertCall[1]).toContain(3);
  });

  it("defaults quantity to 1 when not provided", async () => {
    const created = plantGroupRow({ id: 11, quantity: 1 });
    db.query
      .mockResolvedValueOnce(insertResult(11))
      .mockResolvedValueOnce(selectResult([created]));

    await plantService.createPlant({
      name: "Snake Plant",
      location: null,
      imageUrl: null,
      costPerUnit: null,
    });

    const insertCall = db.query.mock.calls[0];
    expect(insertCall[1][4]).toBe(1);
  });
});

describe("updatePlant", () => {
  it("updates the plant and returns the updated row", async () => {
    const existing = plantGroupRow({ id: 5, quantity: 3 });
    const updated = plantGroupRow({ id: 5, name: "Updated Fern", quantity: 3 });
    db.query
      .mockResolvedValueOnce(selectResult([existing]))
      .mockResolvedValueOnce(selectResult([]))
      .mockResolvedValueOnce(selectResult([updated]));

    const result = await plantService.updatePlant(5, {
      name: "Updated Fern",
    });

    expect(result.name).toBe("Updated Fern");
    const updateCall = db.query.mock.calls[1];
    expect(updateCall[0]).toContain("UPDATE plants SET");
  });

  it("preserves existing quantity when quantity is undefined", async () => {
    const existing = plantGroupRow({ id: 5, quantity: 7 });
    db.query
      .mockResolvedValueOnce(selectResult([existing]))
      .mockResolvedValueOnce(selectResult([]))
      .mockResolvedValueOnce(selectResult([existing]));

    await plantService.updatePlant(5, { name: "Same Fern" });

    const updateCall = db.query.mock.calls[1];
    // quantity param is at index 4 in the params array
    expect(updateCall[1][4]).toBe(7);
  });

  it("updates quantity when explicitly provided", async () => {
    const existing = plantGroupRow({ id: 5, quantity: 3 });
    db.query
      .mockResolvedValueOnce(selectResult([existing]))
      .mockResolvedValueOnce(selectResult([]))
      .mockResolvedValueOnce(selectResult([{ ...existing, quantity: 10 }]));

    await plantService.updatePlant(5, { name: "Fern", quantity: 10 });

    const updateCall = db.query.mock.calls[1];
    expect(updateCall[1][4]).toBe(10);
  });

  it("returns null when the plant does not exist", async () => {
    db.query.mockResolvedValue(selectResult([]));

    const result = await plantService.updatePlant(999, { name: "Ghost" });

    expect(result).toBeNull();
  });
});

describe("deletePlant", () => {
  it("returns true when a plant is deleted", async () => {
    db.query.mockResolvedValue(deleteResult(1));

    const result = await plantService.deletePlant(5);

    expect(result).toBe(true);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM plants WHERE id = ?"),
      [5],
    );
  });

  it("returns false when the plant does not exist", async () => {
    db.query.mockResolvedValue(deleteResult(0));

    const result = await plantService.deletePlant(999);

    expect(result).toBe(false);
  });
});
