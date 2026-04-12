const { z } = require("zod");

/**
 * Centralized environment validation using Zod.
 * Validated once at first import — crash early on misconfiguration.
 *
 * Usage: const env = require("../lib/env");
 *        env.DB_HOST, env.PORT, etc.
 */

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:8082"),

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

  // Monday.com (optional — sync features degrade gracefully when absent)
  MONDAY_API_TOKEN: z.string().optional(),
  MONDAY_BOARD_ID: z.string().optional(),
  MONDAY_WEBHOOK_SECRET: z.string().optional(),
  MONDAY_API_VERSION: z.string().default("2024-10"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Environment validation failed:\n${messages}`);
}

module.exports = result.data;
