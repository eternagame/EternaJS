Notes

* Entry point: `Eterna.initialize_game()`
* `GameObject`: root object
    - `GameAnimator` functions similarly to tasks
* `PoseEdit`
* `GameMode`: GameObject wrapper

## Puzzles that demonstrate various drawing options:

* Simple puzzle:
    - PUZZLE_ID = 4350940
* Continuous colors for the exp. data/extended 4 color scale for "exp" data
    - "Nando's zippers"
    - PUZZLE_ID = 3562529
    - SOLUTION_ID = 3562568
* Circular barcode markings:
    - "4x4 TEP Riboswitch"
    - PUZZLE_ID = 
* PIP; 'paint_tools' booster:
    - Tryptophan A Same State (MGA)
    - PUZZLE_ID = 8787266
    
## Refactoring requests


* "Picture-in-picture" ugliness: PoseField, PoseEdit
* maybe undo stack is a problem?
