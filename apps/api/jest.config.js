module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./src/test/setup.js"],
  testMatch: ["**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/test/**",
    "!src/server.js",
  ],
};
