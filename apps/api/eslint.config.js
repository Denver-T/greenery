// apps/api/eslint.config.js
// Flat config (ESLint v9+)

const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // Ignore generated / vendor folders
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**", "build/**"],
  },

  // Lint all JS files in this package
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // Team-friendly defaults (not too strict)
      "no-console": "off",
    },
  },
];