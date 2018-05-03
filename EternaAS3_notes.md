Notes

* Entry point: `Eterna.initialize_game()`
* `GameObject`: root object
    - `GameAnimator` functions similarly to tasks
* `PoseEdit`
* `GameMode`: GameObject wrapper

Did:

- Typescript, with ES6 target
- Babel brings us ES5 support
- we get nice things like Promises, async/await, a proper Map type
- PIXI is a really close correspondence to flash Display List
- resource loading and input management is a bit  different but not a big deal
- “Flashbang-core” - nicer GameObjects, mode management, and tasks
- Got existing project building

Questions:

* Where should I be developing? (Currently in a private github repo)
    - Will get a github
* IRC chat? (we don’t have proper sockets on the web - would have to set up a relay server) (https://github.com/elementalalchemist/txircd)
    - Already done
* EternaScript? Is this the same as RScript?
    - No - RScript is for the tutorial, and is AS3-based
    - EternaScript is just javascript, with an interface into the AS3 game
* Solving for eval() of javascript feels like a separate project
    - (Yes - we'll just keep this as is for now)
* Help set up milestones? I don’t know everything there is to know.
* Unit tests or other methods of evaluating things like “RNAInverse” and the various Folders?
* "Rearchitecting" vagueness -
    - I'm massaging things to make them more understandable and making minor refactors as I go
    - Are there specific "this needs to be refactored to solve X" requests?

NEW TODO:

* Audit the database writes that the existing client makes, to decide what should stick around and what's not safe
* RNAInverse isn't needed
* C folders:
    - Vienna/Vienna2 should be stable
    - NuPACK should have unit tests
* Refactoring requests:
    - "Picture-in-picture" ugliness: PoseField, PoseEdit
    - maybe undo stack is a problem?
* TODO for next meeting:
    - List of remaining questions in a doc
    - Milestone list (to be done for final-final meeting)?
    - Set of slides/google doc with milestone. A bit more formal than the tech stack writeup
