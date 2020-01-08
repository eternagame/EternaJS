# EternaJS

A ~~Javascript~~ TypeScript port of the Eterna game

## Setup

The project uses NPM for dependency management, webpack for packaging, and babel to polyfill ES2015 language features into ES5 and earlier.

* Install `npm` (via `nodejs`): 
    - https://nodejs.org/en/download/
* `$ npm install` in root directory
* Install and build the energy models via the instructions in [lib/README.md](lib/README.md). These are not included due to licensing restrictions.
* Create a .env file:
    - `$ cp .env.example .env` and fill in the values. 
    - To start, you can use `APP_SERVER_URL=https://eternagame.org`, and use your actual player ID and password for `DEBUG_PLAYER_ID` and `DEBUG_PLAYER_PASSWORD`. If you will be performing actions which cause data to be uploaded to our servers that could create inconsistencies, spam, or other potential problems, please use http://eternadev.org instead.

## Running tests

`$ npm run test`

## Building and running
* Compile and Serve:
    - `$ npm run start`

* To do the first puzzle in Eterna, load up `http://localhost:63343/?puzzle=4350940`, and ask your browser to View JavaScript Console. To create your own test puzzles, check out the next section.

## Setting up new test puzzles
 * Create your puzzle using the puzzlemaker GUI by clicking the "Create Puzzle" button at `http://eternadev.org/web/playerpuzzles/`

 * For functionality not available via the puzzlemaker, a puzzle can be directly set up via Drupal on the `eternadev` server through http://eternadev.org/node/add/puzzle and edited with `http://eternadev.org/node/<id>/edit`. Your login will need to have been granted Drupal admin access. We are working on a way to define and load puzzles locally, but until that time if you need a custom puzzle set up, let us know.

 * After you publish, you should be able to see the puzzle on the same player puzzles page, and figure out its ID by clicking on the puzzle.

## Contributing
For introductory material to this codebase and the technologies it is built with, check out https://github.com/eternagame/development-bootcamp. If you're looking for somewhere to start contributing, check out our [issues labelled good first issue](https://github.com/eternagame/EternaJS/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).

 * Fork the repository

 * Make your changes in a separate git branch. In command line, use a command like `git checkout -b myawesomefeature`. 
 
 * VS Code is a superb IDE for developing EternaJS, available for Mac & Windows. (Even Rhiju, a hardcore Emacs user, has converted.)

 * When you're ready to merge into master for deployment, create a pull request at `https://github.com/Eternagame/EternaJS/pulls`. We will then perform a code review.
 
 Please note that for some reason or another, we may not approve of adding a feature you may have written. To avoid doing work we may reject later please [open an issue](https://github.com/eternagame/eternajs/issues) and we will triage it and/or initiate discussion about the feature. That said, feel free to work on changes for your own experimentation. Eternascript boosters are also a great way to add in extra tools you want to see added, without needing us to consider whether or not that feature makes sense as a first-class citizen, or the specifics of how it needs to be implemented for a consistent user experience.
