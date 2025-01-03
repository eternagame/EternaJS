# Booster Structure

## Accessing the applet

```js
let applet = document.getElementById("maingame");
if (applet === null) return "maingame element missing";
```

from there, APIs can be used like this:

```js
let ok = applet.set_sequence_string(my_seq);
```

Read more about the APIs in [Booster APIs](/reference/booster-apis.md).

## Synchronous vs Asynchronous

In order to ensure that multiple boosters and user interaction do not interfere with each other, boosters are run one at a time and the UI is locked preventing user input while a booster is running. For "synchronous" scripts (which do all their work immediately and without stopping), this "just works". However, if a script performs any actions asyncronously (eg using setTimeout/setInterval, promises/async/await, asyncronous network requests, etc), the game will think your code has already ended, when it will actually be running some code after it initially finishes executing and returns a result (either via an explicit `return` or running to the end of the script).

Because of this, in order for asyncronous scripts to be properly handled, it needs to indicate that it is asyncronous and let the game know once it has completed. This is done by the script ending with the statement `return {async: "true"};` and then once it is actually complete, calling `applet['end\_'+sid](r);` where sid is the ID of the script.

EternaScripts also have timeout-checking statements automatically inserted in loops. This causes the code to stop if the script has been running for more than (by default) 10 seconds. In asyncronous scripts, you are likely going to be running code after that timeout happens. To prevent this behavior, you can use the statement `global_timer = new Date();`.

For an example of a syncronous booster, see the [Tsumego](https://eternagame.org/scripts/7070114) script. For an example of a asyncronous booster, see the [Naive Solver script](https://eternagame.org/scripts/6713763).
