const path = require('path');

module.exports = {
  verbose: true,
  setupFilesAfterEnv: [path.join(__dirname, './jest.setup.js')],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.[jt]s?(x)'],
  automock: false,
  resetMocks: false,
  moduleNameMapper: {
    '~/(.*)': '<rootDir>/src/$1',
  },
};
