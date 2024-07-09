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
  "preset": "ts-jest/presets/default-esm",
  "moduleDirectories": [
    "node_modules",
    "src",
    "<rootDir>"
  ],
  "moduleNameMapper": {
    "\\.(css|less)$": "assets/__mocks__/styleMock.js",
    "engines-bin/(.*)": `${getEngineLocation()}/$1`,
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  "transform": {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|onnx|wasm)$": "<rootDir>/../assets/__mocks__/fileTransformer.js",
  },
  "transformIgnorePatterns": ["/node_modules/.*(?<!\.onnx)$"],
  "rootDir": "src",
  "testRegex": "/__tests__/.*\\.test\\.(ts|tsx|js)$",
  "setupFiles": [
    "jest-canvas-mock",
    "dotenv/config"
  ],
  "testEnvironment": "jsdom",
  "testEnvironmentOptions": {
    // If a dependency states that it has environments for different runtimes, we choose to
    // load the node version (vs the browser version). In particular this is relevant for onnxruntime,
    // in which the browser bundle will auto-detect it is running in a node environment and use
    // codepaths which don't actually work (we could work around that with a custom environment
    // but that seems more brittle)
    "customExportConditions": ["node"],
  }
}
