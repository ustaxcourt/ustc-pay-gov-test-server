/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["dotenv/config"],
  bail: true,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // silent: true,
};
