/**
 * ESLint configuration for the Expo (React Native) app.
 *
 * Why this exists:
 * - ESLint needs a config file to know how to parse React Native / JSX syntax.
 * - `eslint-config-expo` sets the correct parser + rules for Expo projects.
 */
module.exports = {
  root: true,
  extends: ["expo"],
  env: {
    node: true,
    es2021: true,
  },
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "build/"],
  rules: {
    // Keep this minimal for students; tighten rules later.
  },
};
