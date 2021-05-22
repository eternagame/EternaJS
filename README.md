# EternaJS

Eterna's gamified RNA design interface

Interested in development? Join the discusson on the Eterna Discord!

[![Eterna Discord](https://discord.com/api/guilds/702618517589065758/widget.png?style=banner2)](https://discord.gg/KYeTwux)

## Setup

- Install `npm` (via `nodejs`):
  - https://nodejs.org/en/download/
- Run `npm install` in the root directory of this repository

## Using NX

This project is structured as an [Nx](https://nx.dev) monorepo to manage its components. Here are some
common actions you might want to take

### Generate a package

To generate a new library, run `npx nx workspace-generator lib <package-name>`.
To generate a new application, run `npx nx workspace-generator app <package-name>`.

There are two types of packages - libraries and applications. Applications can be loaded directly by
a browser via an html entry point once built. No other pacakge imports an application. Libraries are
shareable across libraries and applications.

### Development server

Run `npx nx serve <app-name>` to run a dev server for a given app.

> Ex: `npx nx serve my-app`

Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

### Build

Run `npx nx build <app-name>` to build an app. The build artifacts will be stored in the `dist/`
directory. Use the `--prod` flag for a production build.

### Running unit tests

Run `npx nx test <package-name>` to execute the unit tests for a package via [Jest](https://jestjs.io).

Run `npx nx affected:test` to execute the unit tests affected by a change.

### Running end-to-end tests

Run `npx nx e2e <package-name>` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `npx nx affected:e2e` to execute the end-to-end tests affected by a change.

## Setting up new test puzzles

- Create your puzzle using the puzzlemaker GUI by clicking the "Create Puzzle" button at `http://eternadev.org/web/playerpuzzles/`
  (or loading up the puzzlemaker in your local copy of EternaJS)

- For functionality not available via the puzzlemaker, a puzzle can be directly set up via Drupal on the `eternadev` server through http://eternadev.org/node/add/puzzle and edited with `http://eternadev.org/node/<id>/edit`. Your login will need to have been granted Drupal admin access. We are working on a way to define and load puzzles locally, but until that time if you need a custom puzzle set up, let us know.

- After you publish, you should be able to see the puzzle on the same player puzzles page, and figure out its ID by clicking on the puzzle.

## Contributing

For introductory material to this codebase and the technologies it is built with, check out https://github.com/eternagame/development-bootcamp. If you're looking for somewhere to start contributing, check out our [issues labelled good first issue](https://github.com/eternagame/EternaJS/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).

- Fork the repository

- Make your changes in a separate git branch. In command line, use a command like `git checkout -b myawesomefeature`.

- VS Code is a superb IDE for developing EternaJS, available for Mac/Windows/Linux. (Even Rhiju, a hardcore Emacs user, has converted.)

- When you're ready to merge into master for deployment, create a pull request at `https://github.com/Eternagame/EternaJS/pulls`. We will then perform a code review.

Please note that for some reason or another, we may not approve of adding a feature you may have written. To avoid doing work we may reject later please [open an issue](https://github.com/eternagame/eternajs/issues) and we will triage it and/or initiate discussion about the feature. That said, feel free to work on changes for your own experimentation. Eternascript boosters are also a great way to add in extra tools you want to see added, without needing us to consider whether or not that feature makes sense as a first-class citizen, or the specifics of how it needs to be implemented for a consistent user experience.

We also recommend joining our [Discord](https://discord.gg/KYeTwux) to chat with other developers.
