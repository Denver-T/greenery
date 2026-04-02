const {
  isNonEmptyString,
  toPositiveInt,
  validateString,
  validateEmail,
  validatePhone,
  validateEnum,
  validateUrl,
  validatePassword,
} = require("./validators");

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
    expect(isNonEmptyString("  a  ")).toBe(true);
  });

  it("returns false for empty or whitespace-only strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(true)).toBe(false);
  });
});

describe("toPositiveInt", () => {
  it("converts valid positive integers", () => {
    expect(toPositiveInt(1)).toBe(1);
    expect(toPositiveInt(42)).toBe(42);
    expect(toPositiveInt("5")).toBe(5);
  });

  it("returns null for zero, negatives, and non-integers", () => {
    expect(toPositiveInt(0)).toBeNull();
    expect(toPositiveInt(-1)).toBeNull();
    expect(toPositiveInt(1.5)).toBeNull();
    expect(toPositiveInt("abc")).toBeNull();
    expect(toPositiveInt(null)).toBeNull();
    expect(toPositiveInt(undefined)).toBeNull();
  });
});

describe("validateString", () => {
  it("trims and returns valid strings", () => {
    expect(validateString("  hello  ")).toBe("hello");
  });

  it("enforces maxLength", () => {
    expect(validateString("toolong", { maxLength: 3 })).toBeNull();
    expect(validateString("ok", { maxLength: 3 })).toBe("ok");
  });

  it("returns null for empty string when required", () => {
    expect(validateString("", { required: true })).toBeNull();
    expect(validateString("   ", { required: true })).toBeNull();
  });

  it("allows null/undefined for optional fields", () => {
    expect(validateString(null)).toBeNull();
    expect(validateString(undefined)).toBeUndefined();
  });

  it("enforces regex pattern", () => {
    expect(validateString("abc", { pattern: /^\d+$/ })).toBeNull();
    expect(validateString("123", { pattern: /^\d+$/ })).toBe("123");
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe("user@example.com");
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("notanemail")).toBeNull();
    expect(validateEmail("@example.com")).toBeNull();
  });

  it("allows null for optional usage", () => {
    expect(validateEmail(null)).toBeNull();
  });
});

describe("validatePhone", () => {
  it("accepts valid phone numbers", () => {
    expect(validatePhone("555-123-4567")).toBe("555-123-4567");
  });

  it("rejects invalid phone numbers", () => {
    expect(validatePhone("not-a-phone")).toBeNull();
    expect(validatePhone("12")).toBeNull();
  });

  it("allows null for optional usage", () => {
    expect(validatePhone(null)).toBeNull();
  });
});

describe("validateEnum", () => {
  it("returns the value if it is in the allowed list", () => {
    expect(validateEnum("active", ["active", "inactive"], "active")).toBe("active");
  });

  it("returns the default if the value is not in the list", () => {
    expect(validateEnum("unknown", ["active", "inactive"], "active")).toBe("active");
  });
});

describe("validateUrl", () => {
  it("accepts valid http/https URLs", () => {
    expect(validateUrl("https://example.com")).toBe("https://example.com");
    expect(validateUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("rejects invalid URLs", () => {
    expect(validateUrl("notaurl")).toBeNull();
    expect(validateUrl("ftp://example.com")).toBeNull();
  });

  it("allows null for optional usage", () => {
    expect(validateUrl(null)).toBeNull();
  });
});

describe("validatePassword", () => {
  it("accepts a password meeting all default requirements", () => {
    expect(validatePassword("Abcdef1!")).toBe("Abcdef1!");
  });

  it("rejects passwords shorter than minLength", () => {
    expect(validatePassword("Ab1")).toBeNull();
  });

  it("rejects passwords without uppercase when required", () => {
    expect(validatePassword("abcdef12")).toBeNull();
  });

  it("rejects passwords without lowercase when required", () => {
    expect(validatePassword("ABCDEF12")).toBeNull();
  });

  it("rejects passwords without numbers when required", () => {
    expect(validatePassword("Abcdefgh")).toBeNull();
  });

  it("allows disabling requirements via options", () => {
    expect(
      validatePassword("simplepass", {
        requireUppercase: false,
        requireNumbers: false,
      })
    ).toBe("simplepass");
  });
});
