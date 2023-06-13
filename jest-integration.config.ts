/** @type {import('ts-jest').JestConfigWithTsJest} */

import type { Config } from "jest";
const config: Config = {
  bail: true,
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["./tests/integration/**"],
};
export default config;
