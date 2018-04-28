* Online docs are great: https://www.typescriptlang.org/docs/home.html
* `async` keyword is a thing
* There are two namespacing facilities, `module` and `namespace`
    - Neither works exactly how you'd expect
    - modules are single-file
    - namespaces can be multi-file, but it's awkward and requires different a different, comment-based `import` declaration
    - (multi-file namespaces get compiled down to a single .js file)
    - I'm eschewing namespacing for the most part
* `process.env.NODE_ENV` can be queried.
    - This is a node convention that webpack 
    - It will either be "production" or "development"
* I've written a simple `Assert` utility class
    - Asserts
    - The typical javascript pattern is to

# AS3 to Typescript

* Use [as3-to-typescript](https://github.com/fdecampredon/as3-to-typescript) tool for a first pass
* use `export` keyword for types and symbols that should be visible outside a file
* `Dictionary` -> `Map<K, V>` (via ES2015; we use Babel to polyfill this for ES5 and earlier)
    - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
* `Array` is type-safe
* `for each (x in y)` -> `for (x of y)`
    - Note the "of" rather than "in" - "in" will iterate keys (Array indexes!)
* No `internal` keyword or private namespaces.
    - I'm leaving internal vars/functions public, and prefixing their names with '_'
* There's no `override` or `final` for functions
* Use `let` instead of `var` (sane scoping rules)
* For anonymous functions, prefer lambda-style:
    - `addCallback(() => { ... })` vs `addCallback(function (): void { ... }`
    - Lambda-style lets you access `this`
* Use lambda-style for passing member functions as callbacks:
    - `addCallback(() => { this.onCallback(); })` instead of `addCallback(this.onCallback)`
    - Otherwise, `this` will improperly bound when the callback is invoked
* Cannot use `instanceof` with interfaces:
    ```
    interface MyInterface { interfaceFunc(): void };
    let obj: MyClass = new MyClass();
    if (obj instanceof MyInterface) { ... } // compile error
    ```
    Instead, use ["type guards"](https://www.typescriptlang.org/docs/handbook/advanced-types.html):
    ```
    let obj: MyClass = new MyClass();
    if (<MyInterface>(obj as any).interfaceFunc) {
        <MyInterface>(obj as any).interfaceFunc();
    }

