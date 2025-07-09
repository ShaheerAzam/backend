// jest.config.ts
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/tests/jest.setup.ts"], // ✅ correct relative path
};
