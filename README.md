# EternaJS

A Javascript port of the Eterna game

## Setup

The project uses NPM for dependency management, webpack for packaging, and babel to polyfill ES2015 language features into ES5 and earlier.

* Install `npm` (via `nodejs`): 
    - https://nodejs.org/en/download/
* `$ npm install` in root directory

## Running tests

`$ npm run test`

## Building and running

* If running locally, you'll need to proxy requests to the eternagame.org server, to add CORS headers:
    - Install `devd` (https://github.com/cortesi/devd)
    - `$ bin/cors-proxy`
    - `cors-proxy` is a local server that just proxies requests to eterngame.org and adds CORS headers to the responses
* Create a .env file:
    - `$ cp .env.example .env`
    - If you're using `cors-proxy`, you'll want to set APP_SERVER_URL to "http://localhost:9001" (or whatever port you run cors-proxy on - it defaults to 9001).
* Compile:
    - `$ npm run build:dev` or
    - `$ npm run build:prod`
* Run:
    - Serve up dist/dev or dist/prod

