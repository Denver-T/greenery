// Unit tests for the module-level DB env validation in db/index.js.
// Each case must run in jest.isolateModules so the throw fires fresh on require()
// without polluting other tests' module cache.

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("db/index module-level env validation", () => {
  it("throws when DB_HOST is missing", () => {
    delete process.env.DB_HOST;

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).toThrow(/Missing required database environment variable: DB_HOST/);
  });

  it("throws when DB_USER is empty string", () => {
    process.env.DB_USER = "";

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).toThrow(/Missing required database environment variable: DB_USER/);
  });

  it("throws when DB_PASSWORD is whitespace-only", () => {
    process.env.DB_PASSWORD = "   ";

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).toThrow(/Missing required database environment variable: DB_PASSWORD/);
  });

  it("throws when DB_NAME is missing", () => {
    delete process.env.DB_NAME;

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).toThrow(/Missing required database environment variable: DB_NAME/);
  });

  it("does not throw when all four required vars are set", () => {
    process.env.DB_HOST = "localhost";
    process.env.DB_USER = "test_user";
    process.env.DB_PASSWORD = "test_pass";
    process.env.DB_NAME = "greenery_test";

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).not.toThrow();
  });

  it("does not throw when DB_PORT is missing (defaults to 3306)", () => {
    process.env.DB_HOST = "localhost";
    process.env.DB_USER = "test_user";
    process.env.DB_PASSWORD = "test_pass";
    process.env.DB_NAME = "greenery_test";
    delete process.env.DB_PORT;

    expect(() => {
      jest.isolateModules(() => {
        require("./index");
      });
    }).not.toThrow();
  });
});
