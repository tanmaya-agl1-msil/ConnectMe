/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // Use the shared package's TypeScript sources directly so tests never depend on a stale build.
  moduleNameMapper: {
    '^@connectme/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
