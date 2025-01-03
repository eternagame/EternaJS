---
outline: [2, 3]
---

# Booster APIs

## General structure

### Accessing the applet

```js
let applet = document.getElementById("maingame");
if (applet == null) return "maingame element missing";
```

from there, APIs can be used like this:

```js
let ok = applet.set_sequence_string(my_seq);
```

### Exploring the API without writing a booster

Every modern browser has some sort of console that lets users input javascript commands.

- Open the puzzle
- Open the javascript console of your browser
- Because the game is loaded in an iframe, you will need to change the console to run commands within the iframe instead of the top-level website page. Somewhere in the console window, there should be a dropdown, likely with "Top" currently selected which will need to be changed to something like "game" or "EternaJS".

## Getters

### get_sequence_string()

Retrieve the current sequence of the puzzle. This includes any bases the user has painted.

#### Type

`() => string`

- Returns: The current sequence present in the puzzle. For example: `"UUUUUUAAAAAAA"`.

#### Example

```js
// When entering a puzzle:
console.log(applet.get_sequence_string()); // AAAAAAAAAAAAAAA
// After painting some bases:
console.log(applet.get_sequence_string()); // AUAUAUAAAAUAUAU
```

### get_full_sequence()

Returns the full sequence currently present in a specific state in the puzzle, including oligos.

The result will be a string containing the sequence of each strand, separated by `&` - such as `"AUUUUU&GGGGG&CCCCCC"`, in which `AUUUUU` is the sequence of the main RNA strand, `GGGGG` is the first oligo's sequence, and `CCCCCC` is the second oligo's sequence.

#### Type

`(index: number) => string`

- `index`: 0-based index of the state to be queried.
- Returns: The full sequence of the given state, including oligos.

#### Example

```js
// When entering a puzzle:
console.log(applet.get_sequence_string()); // AAAAAAAAAAAAAAA
// After painting some bases:
console.log(applet.get_sequence_string()); // AUAUAUAAAAUAUAU
```
