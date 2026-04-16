const path = require("path");
const { z } = require("zod");

/**
 * Centralized environment validation using Zod.
 * Validated once at first import — crash early on misconfiguration.
 *
 * Usage: const env = require("../lib/env");
 *        env.DB_HOST, env.PORT, etc.
 */

// Empty string → undefined, so `FOO=` in .env behaves identically to an
// absent line. Without this, `z.string().min(N).optional()` crashes boot on
// empty values because optional() only accepts undefined, not "".
const emptyToUndefined = (v) => (v === "" ? undefined : v);

const envSchema = z
  .object({
    // Server
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    // Database
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    DB_SSL: z
      .preprocess((v) => v === "true" || v === "1", z.boolean())
      .default(false),

    // Storage
    UPLOAD_DIR: z.string().default(path.join(__dirname, "../../uploads")),

    // CORS
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:8082"),

    // Firebase Admin
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),

    // Auth
    AUTH_PROVIDER: z.string().default("firebase"),

    // Rate limiting
    RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().default(900000),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().default(10),
    RATE_LIMIT_WRITE_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_WRITE_MAX: z.coerce.number().default(30),

    // Monday.com (optional — sync features degrade gracefully when absent).
    // MONDAY_WEBHOOK_SECRET must be ≥32 chars when set — used in the inbound
    // webhook URL path for authentication. Generate with: openssl rand -hex 32
    // All three Monday vars run through emptyToUndefined so a fresh `.env`
    // copied from `.env.example` with blank values degrades to "Monday sync
    // disabled" instead of hard-crashing validation.
    MONDAY_API_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
    MONDAY_BOARD_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    MONDAY_WEBHOOK_SECRET: z.preprocess(
      emptyToUndefined,
      z.string().min(32).optional(),
    ),
    MONDAY_API_VERSION: z.string().default("2024-10"),
  })
  // When MONDAY_WEBHOOK_SECRET is set, MONDAY_BOARD_ID must also be set.
  // The inbound handler uses MONDAY_BOARD_ID as a defense-in-depth filter
  // (drop events for unexpected boards) — without it, a stolen secret
  // could be used against any Monday board the API is exposed to.
  .refine((v) => !v.MONDAY_WEBHOOK_SECRET || !!v.MONDAY_BOARD_ID, {
    message:
      "MONDAY_BOARD_ID is required when MONDAY_WEBHOOK_SECRET is set (defense-in-depth: webhook handler drops events for unexpected boards)",
    path: ["MONDAY_BOARD_ID"],
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Environment validation failed:\n${messages}`);
}

module.exports = result.data;
