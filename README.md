# EternaJS

A ~~Javascript~~ TypeScript port of the Eterna game

## Setup

The project uses NPM for dependency management, webpack for packaging, and babel to polyfill ES2015 language features into ES5 and earlier.

* Install `npm` (via `nodejs`): 
    - https://nodejs.org/en/download/
* `$ npm install` in root directory

* You may also need to create the `dist/` folder:
`$ mkdir dist` and install [coffeescript](https://coffeescript.org/) via `npm install --save-dev coffeescript`


## Running tests

`$ npm run test`

## Building and running

* When running locally, run your local web server at [http://localhost:63343](http://localhost:63343) - the eterna server currently allows CORS requests from these two localhost addresses.
 
* Create a .env file:
    - `$ cp .env.example .env` and fill in the values. 
    - To start, you can use `APP_SERVER_URL=https://eternagame.org`, and use your actual player ID and password for `DEBUG_PLAYER_ID` and `DEBUG_PLAYER_PASSWORD`
* Create the directory `dist`:
    - `$ mkdir dist`
* Compile and Serve:
    - `$ npm run start`

* To do the first puzzle in Eterna, load up `http://localhost:63343/?puzzle=4350940`, and ask your browser to View JavaScript Console. To create your own test puzzles, check out the next section.

## Setting up new test puzzles
 * You can directly set up a puzzle via Drupal on the `eternadev` server through `http://eternadev.org/node/add/puzzle`. Your login will need to have been granted Drupal admin access.

 * Alternatively, you can create your puzzle using the puzzlemaker GUI by clicking the "Create Puzzle" button at `http://eternadev.org/web/playerpuzzles/`

 * After you publish, you should be able to see the puzzle on the same player puzzles page, and figure out its ID by clicking on the puzzle. You can then refine the puzzle using Drupal, e.g.,  `http://eternadev.org/node/9151538`


## Development
 * Make your changes in a separate git branch. In command line, use a command like `git checkout -b myuserid/myawesomefeature`. 
 
 * `VScode` is a superb IDE for developing EternaJS, available for Mac & Windows. (Even Rhiju, a hardcore Emacs user, has converted.)
  
 * Before committing (and on encountering issues), make sure to run 

```
$ npm run typecheck
$ npm run lint
$ npm run test
``` 

to validate the TypeScript, validate your codestyle, and to run our unit tests (currently just for the folding engines).  This helps make sure no issues were introduced (in the future, we'll also set up CI). Some of these will also be run automatically for you by `husky` when you `git push`.

 * If you see a lot of `lint` errors, note that you can ask to fix many of them automatically via: `$ npm run lint -- --fix`

 * When you're ready to merge into master for deployment, create a pull request at `https://github.com/Eternagame/EternaJS/pulls`. Ask for a code review.

## Deployment

 * Deploy and test first on `eternadev.org`, and only after testing on several puzzles, deploy on production (`eternagame.org`).

 * Make sure another admin has set up a login and your `id_rsa.pub` on `eternadev.org` and `eternagame.org`. 

 * To deploy the code from the active branch, run this command on the server:
`cd /persistent/drupal/html/eternajs && git pull && npm run build:prod`

 * You will need to authenticate to github if you don't have a ssh key set up.

 * If you aren't sure which branch is active, simply run `cd /persistent/drupal/html/eternajs && git branch`

 * Currently, `eternadev.org` is running off the `master` branch, and `eternagame.org` is running off `stable`. 
 
 * When you make an update into production `eternagame.org`, please do the following to properly archive and record your contributions:
     - create a release at `https://github.com/Eternagame/EternaJS/releases`, incrementing 3rd digit for bugfixes.
	 - convey the updates to developers and any super-interested players in release notes at http://eternawiki.org/wiki/index.php5/Main_Page
     - write a blog post if there is anything that might affect users pleasantly at https://eternagame.org/node/add/devblog Include a screenshot as a figure! You can also include a link to your detailed release notes. The blog post should be visible in your newsfeed https://eternagame.org/web/newsfeed/?sort=date and you can find an edit button there.
