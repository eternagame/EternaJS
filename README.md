# EternaJS

A ~~Javascript~~ TypeScript port of the Eterna game

## Setup

The project uses NPM for dependency management, webpack for packaging, and babel to polyfill ES2015 language features into ES5 and earlier.

* Install `npm` (via `nodejs`): 
    - https://nodejs.org/en/download/
* `$ npm install` in root directory

## Running tests

`$ npm run test`

## Building and running

* When running locally, run your local web server at http://localhost:63342 or http://localhost:63343 - the eterna server currently allows CORS requests from these two localhost addresses.
* Create a .env file:
    - `$ cp .env.example .env` and fill in the values
* Compile:
    - `$ npm run typecheck && npm run build:dev` or
    - `$ npm run typecheck && npm run build:prod`
* Run:
    - Serve up dist/dev or dist/prod

