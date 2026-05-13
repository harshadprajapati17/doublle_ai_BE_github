export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {},
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^(\\.{1,2}/)+generated/prisma/client\\.ts$":
      "<rootDir>/__mocks__/prismaGeneratedClient.js",
  },
};
