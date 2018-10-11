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
* Compile and Serve:
    - `$ npm start`

Before committing (and on encountering issues), make sure to run `npm run typecheck` (to validate the TypeScript) and `npm run test` (to run our unit tests, currently just for the folding engines) to make sure no issues were introduced (in the future, we'll also set up CI).
