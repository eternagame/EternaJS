const path = require('path');

const dotenv = require('dotenv');
const loadEnv = envPath => {
  try {
    dotenv.config({ path: envPath });
  } catch (err) {
    // only ignore error if file is not found
    if (err.toString().indexOf('ENOENT') < 0) {
      throw err;
    }
  }
}

// Contrary to what you'd expect, the first env loaded is the one whose values are kept
loadEnv(path.join(__dirname, './.env.local'));
loadEnv(path.join(__dirname, './.env'));

function getEngineLocation() {
  switch (process.env.ENGINE_LOCATION) {
    case 'local':
      return path.resolve(__dirname, './src/eterna/folding/engines');
    case 'package':
      return 'eternajs-folding-engines/engines';
    default:
      throw new Error('Invalid engine location');
  }
}

module.exports = {
  "preset": "ts-jest",
  "moduleDirectories": [
    "node_modules",
    "../",
    "src",
    ""
  ],
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js"
  ],
  "moduleNameMapper": {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "assets/__mocks__/fileMock.js",
    "\\.(css|less)$": "assets/__mocks__/styleMock.js",
    "engines-bin/(.*)": `${getEngineLocation()}/$1`
  },
  "rootDir": "src",
  "transform": {
    "\\.(ts|tsx)$": "ts-jest"
  },
  "testRegex": "/__tests__/.*\\.test\\.(ts|tsx|js)$",
  "globals": {
    "ts-jest": {
      "babelConfig": false,
      "tsconfig": "./tsconfig.jest.json"
    }
  },
  "setupFiles": [
    "jest-canvas-mock",
    "dotenv/config"
  ],
  "testEnvironment": "jsdom"
}
