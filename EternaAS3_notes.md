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

* Help set up milestones? I don’t know everything there is to know.
* Unit tests or other methods of evaluating things like “RNAInverse” and the various Folders?

Questions (Week 2)

* nupack - FullAlchFold: "constraints" seem to be unused?

NEW TODO:

* Audit the database writes that the existing client makes, to decide what should stick around and what's not safe
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
