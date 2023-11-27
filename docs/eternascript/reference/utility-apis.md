---
outline: [2,3]
---

# Utility APIs

## Result Output

::: info
Result output is only available to standalone scripts
:::

### out()
Add text to result region

#### Type
`(text: string) => void`
* `text`: The text to display


#### Example
```js
out('Hello');
out('world');
// Helloworld
```

### outln
Add text to result region with newline

#### Type
`(text: string) => void`
* `text`: The text to display

#### Example
```js
outln('Hello');
outln('world');
// Hello
// world
```

### clear()
Clear result region

#### Type
`() => void`

#### Example
```js
outln('Hello');
clear();
outln('world');
// world
```

## Library Functions

### Lib.bases
Returns the string containing characters for RNA bases

#### Type
`string`

#### Example
```js
console.log(Lib.bases);
// AGCU
```

### Lib.fold()
Return folded structure for a sequence

::: warning
Not currently functional in standalone scripts.
:::

::: tip
In boosters, this is same as calling the [booster fold() API](/reference/booster-apis#fold)
:::

#### Type
`(sequence: string) => string`
* `sequence`: RNA sequence to fold
* Returns: Dot-bracket structure

#### Example
```js
console.log(Lib.fold('GGGGAAAACCCC'))
// ((((....))))
```

### Lib.energyOfStruct()
Return free energy of an RNA structure with a specific sequence

::: warning
Not currently functional in standalone scripts.
:::

::: tip
In boosters, this is same as calling the [booster energy_of_structure() API](/reference/booster-apis#energy_of_structure)
:::

#### Type
`(sequence: string, structure: string) => number`
* `sequence`: RNA sequence to calculate energy with
* `structure`: Dot-bracket structure to calculate energy with
* Returns: Free energy in KCal/mol

#### Example
```js
console.log(Lib.energyOfStruct('GGGGAAAACCCC', '((((....))))'))
// -5.400000095367432
```

### Lib.EternaScript()
Retrieve another EternaScript for later evaluation

#### Type
`(scriptId: number, scure?: boolean) => Function`
* `scriptId`: ID of the script to retrieve
* `secure`: If true, runs the script execution approval workflow, presenting a warning 
and asking for the user's consent before running if the script is created by someone else who
is not a trusted author
* Returns: Function that can be executed to run the script (with the script's inputs converted
to arguments)

#### Example
Script 1234, with inputs "a", "b", and "c" (in that order)
```js
if (a) {
    return b + c;
} else {
    return b - c;
}
```

From another script
```js
let f = Lib.EternaScript(1234);
console.log(f(true, 2, 3))
// 5
```

### Lib.getStructure()
Retrieve the target structure of a puzzle

::: info
Note that this will return the same structure used to render the puzzle's thumbnail.
That is (by convention), for switch puzzles it will contain the state 1 structure, and
the structure will not include any oligos
:::

::: tip
For boosters, use the [get_target_structure()](/reference/booster-apis#get_target_structure)
booster API instead.
:::

#### Type
`(puzzleId: number) => string`
* `puzzleId`: ID of the puzzle to retrieve the target structure of
* Returns: Dot-bracket target structure of the puzzle

#### Example
```js
console.log(Lib.getStructure(20111))
// (((((......)))))
```

### Lib.getStructureWithAsync()
Retrieve the target structure of a puzzle with an non-blocking/asynchronous request

::: info
Note that this will return the same structure used to render the puzzle's thumbnail.
That is (by convention), for switch puzzles it will contain the state 1 structure, and
the structure will not include any oligos
:::

::: tip
For boosters, use the [get_target_structure()](/reference/booster-apis#get_target_structure)
booster API instead.
:::

#### Type
`(puzzleId: number, callback: (structure: string) => void) => string`

* `puzzleId`: ID of the puzzle to retrieve the target structure of
* Returns: Dot-bracket target structure of the puzzle

#### Example
```js
Lib.getStructureWithAsync(20111, function(structure) {
    console.log(structure)
})
// (((((......)))))
```

### Lib.replace()
Repalce element of sequence at the given index of the sequence with the target.
If an array is passed, the sequence will be mutated in place in addition to being returned.

#### Type
`<SequenceType extends string | string[]>(sequence: SequenceType, index: number, target: string) => SequenceType`
* `sequence`: string or array to replace an element of
* `index`: Position of sequence to replace (0-indexed)
* `target`: Element to use as a replacement
* Returns: Sequence with replacement performed

#### Example
```js
Lib.replace("AGCU", 2, "A");
// AGAU
```

### Lib.nextSequence()
Generate next sequencial sequence using the default order of bases (according to [Lib.bases](#libbases)).
If an array is passed, the sequence will be mutated in place in addition to being returned.

#### Type
`<SequenceType extends string | string[]>(sequence: SequenceType) => SequenceType`
* `sequence`: Sequence to get next sequence from
* Returns: Next sequence

#### Example
```js
console.log(Lib.nextSequence("AAAA"));
// GAAA
```

### Lib.nextSequenceWithBases()
Generate next sequencial sequence using the provided order of bases.
If an array is passed, the sequence will be mutated in place in addition to being returned.

#### Type
`<SequenceType extends string | string[]>(sequence: SequenceType, bases: string | string[]) => SequenceType`
* `sequence`: Sequence to get next sequence from
* `bases`: Order of bases to use
* Returns: Next sequence

#### Example
```js
console.log(Lib.nextSequenceWithBases("UUUU", "UCGA"));
// CUUU
console.log(Lib.nextSequenceWithBases("AUAA", "UCGA"));
// UCAA
```


### Lib.random()
Generate random number within specified bounds

#### Type
`(from: number, to: number) => number`
* `from`: Lowest allowable number (inclusive)
* `to`: Highest allowable number (inclusive)
* Returns: Number between `from` and `to`

#### Example
```js
console.log(Lib.random(5, 10))
// 8
console.log(Lib.random(5, 10))
// 5
console.log(Lib.random(5, 10))
// 10
```

### Lib.randomSequence()
Generate a random sequence of bases

#### Type
`(size: number) => string`
* `size`: Length (number of bases) of the resulting sequence
* Returns: Sequence string

#### Example
```js
console.log(Lib.randomSequence(5));
// AUUCA
console.log(Lib.randomSequence(5));
// CCGGC
```

### Lib.map()
Applies function to each base of sequence

#### Type
`<OutputType>(fn: (element: string, index: number) => OutputType, sequence: string | string[]) => OutputType[]`
* `fn`: Function to run for each element, passed the individual element and its index in the sequence
* `sequence`: Sequence to iterate over elements of
* Returns: Array of results returned from the mapping function

#### Example
```js
console.log(Lib.map(function (el, idx) {return [el, idx]}), 'AU');
// [['A', 0], ['U', 1]]
```

### Lib.filter()
Applies function to each base of sequence, returning only elements
where the function returns true

#### Type
`(fn: (element: string) => boolean, sequence: string | string[]) => string`
* `fn`: Function to run for each element, passed the individual element and its index in the sequence
* `sequence`: Sequence to iterate over elements of
* Returns: Array of results returned from the mapping function

#### Example
```js
console.log(Lib.map(function (el) {return el === 'A'}), 'AUGA');
// 'AA'
```

### Lib.splitDefault()
Split structure into a structure array

#### Type
`(structure: string) => string[]`
* `structure`: Dot-bracket structure to split
* Returns: Split structure

#### Example
```js
console.log(Lib.splitDefault("((..))"));
// ["((", "..", "))"]
```

### Lib.join()
Join array of strings into a single string

#### Type
`(array: string[]) => string`
* `array`: Array of strings to join
* Returns: Concatenated strings

#### Example
```js
console.log(Lib.join(["((", "..", "))"]));
// ((..))
```

### Lib.distance()
Return number of differences between two structures

#### Type
`(structureA: string, structureB: string) => number`
* `structureA`: First structure to compare
* `structureB`: Second structure to compare
* Returns: Number of differences between two structures, or -1 if different lengths

#### Example
```js
console.log(Lib.distance("((..))", "((()))"));
// 2
console.log(Lib.distance("(((())))", "(())"));
// -1
```

### Lib.distanceCustom()
Return number of differences between two structures with custom rule

#### Type
`(fn: (index: number) => number, structureA: string, structureB: string) => number`
* `structureA`: First structure to compare
* `structureB`: Second structure to compare
* Returns: Number of differences between two structures, or -1 if different lengths

#### Example
```js
let structureA = '((()))'
let structureB = '((..))'
console.log(Lib.distanceCustom(function(index){
    return structureA[index] !== structureB[index] ? 2 : 0;
}, structureA, structureB));
// 4
```

## Class RNA
The RNA class represents an RNA structure as a tree of [RNAElement](#class-rnaelement)s.
Each node will either be a loop or a stack, and the root node is the loop/stack
at the first base.

### new RNA()
Creates a new instance of the RNA class

#### Type
`(structure: string) => RNA`
* `structure`: Dot-bracket secondary structure

#### Example
```js
let rna = new RNA('((...))');
```

### RNA#getPairmap()
Gets array of base pairing partners

#### Type
`(structure: string) => (number | undefined)[]`
* `structure`: Dot-bracket secondary structure
* Returns: Array such that the entry at index i is the index of its pairing partner
(or `undefined` if unpaired)

#### Example
```js
console.log(new RNA('').getPairmap('((...))'))
// [ 6, 5, , , , 1, 0 ]
```

### RNA#getStructure()
Returns the structure of the current [RNA](#class-rna) instance

#### Type
`() => string`

#### Example
```js
console.log(new RNA('((...))').getPairmap());
// ((...))
```

### RNA#getRootElement()
Return the root [RNAElement](#class-rnaelement) instance of the current [RNA](#class-rna) instance

#### Type
`() => RNAElement`

#### Example
```js
console.log(new RNA('((...))').getRootElement().getIndices());
// [ 0, 1, 5, 6 ]
```

### RNA#map()
Applies function to all [RNAElement](#class-rnaelement)s

#### Type
`(fn: (element: RNAElement) => void) => void`
* `fn`: Function to call for each element of the RNA structure

#### Example
```js
new RNA('((...))').map(function(element){
    console.log(element.getIndices())
});
// [ 0, 1, 5, 6 ]
// [ 2, 3, 4 ]
```

## Class RNAElement
A node of a secondary structure represented as a tree via the [RNA](#class-rna) class

### RNAElement#getParent()
Returns the parent node of the currnt [RNAElement](#class-rnaelement) instance

#### Type
`() => RNAElement`

#### Example
```js
let rna = new RNA('((...))');
let root = rna.getRootElement();
console.log(root.getChilds()[0].getParent() === root);
// true
```

### RNAElement#getChilds()
Returns the child nodes of the currnt [RNAElement](#class-rnaelement) instance

#### Type
`() => RNAElement[]`

#### Example
```js
let rna = new RNA('((...))');
let root = rna.getRootElement();
console.log(root.getChilds().length);
// 1
console.log(root.getChilds()[0].getIndices());
// [ 2, 3, 4 ]
```

### RNAElement#getElements()
Return details of each base contained in the current [RNAElement](#class-rnaelement) instance.

#### Type
`() => {index: number; structure: string; pair?: number}[]`

The properties of the objects returned are:
* `index`: The index in the entire sequence of the base being descrobed
* `structure`: Dot-bracket character of the base being described
* `pair`: If thie RNAElement is describing a stack, the index of the other base the base being
descrobed is paired to


#### Example
```js
let rna = new RNA('((...))');
let root = rna.getRootElement();
console.log(new RNA('((...))').getRootElement().getElements())
// [
//   { index: 0, structure: "(", pair: 6 },
//   { index: 1, structure: "(", pair: 5 },
//   { index: 5, structure: ")", pair: 1 },
//   { index: 6, structure: ")", pair :0}
// ]
console.log(new RNA('((...))').getRootElement().getChilds()[0].getElements()) 
// [
//   { index: 2, structure: "." },
//   { index: 3, structure: "." },
//   { index: 4, structure: "." }
// ]
```

### RNAElement#getBaseType()
Returns whether the current [RNAElement](#class-rnaelement) instance is a stack or loop

#### Type
`() => RNAElement.Stack | RNAElement.Loop`

::: tip
The return type is more generally a string. `RNAElement.Stack` and `RNAElement.Loop`
are constants which hold the two strings that could be returned by this function
:::

#### Example
```js
console.log(new RNA('((...))').getRootElement().getBaseType())
// stack
```

### RNAElement#getType()
Returns the detailed loop type of the current [RNAElement](#class-rnaelement) instance
(or null if not a loop)

#### Type
`() => RNAElement.Hairpin | RNAElement.Bulge | RNAElement.Internal | RNAElement.Multiloop | RNAElement.Dangling | null`

::: tip
The return type is more generally a string. `RNAElement.Hairpin`, `RNAElement.Bulge`, etc 
are constants which hold the strings that could be returned by this function
:::

#### Example
```js
console.log(new RNA('((...))').getRootElement().getChilds()[0].getType())
// Hairpin
```

### RNAElement#getIndices()
Gets the indices of the bases contained in the current [RNAElement](#class-rnaelement) instance

#### Type
`() => number[]`

#### Example
```js
console.log(new RNA('((...))').getRootElement().getIndices());
// [ 0, 1, 5, 6 ]
```

### RNAElement#isStack()/RNAElement#isLoop()/RNAElement#isHairpin()/RNAElement#isBulge()/RNAElement#isInternal()/RNAElement#isMultiloop()/RNAElement#isDangling() {#rnaelement-isstructure}
Returns whether the [RNAElement](#class-rnaelement) instance is a stack, loop, hairpin, etc

#### Type
`() => boolean`

#### Example
```js
console.log(new RNA('((...))').getRootElement().isStack());
// true
```

### RNAElement.getSegmentCount()
Returns how many structure segments are included in the current [RNAElement](#class-rnaelement)
If the multiloop consists of 2 branches then getSegmentCount() of multiloop returns 2

#### Type
`() => number`

#### Example
```js
console.log(new RNA('.(...).(...).((...))').getRootElement().getSegmentCount());
// 3
```
