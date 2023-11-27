# Getting Started

## What is EternaScript?

EternaScript is a JavaScript-based toolset that allows Eterna players to write and execute custom
programs to extend their Eterna experience, ranging from puzzle solving algorithms
to analysis utilities to tools that can generate statistics on your Eterna activity and more.

EternaScript is comprised of the following components:
* The <a :href="`https://eternagame.org/scripts`">script registry</a> and
<a :href="`https://eternagame.org/scripts/create`">authoring environment</a>
on the Eterna website
* Execution environments which allow players to run these scripts either from the script
registry ("standalone" scripts) or within an Eterna puzzle ("boosters")
* JavaScript libraries and APIs, providing script authors useful utilities for working with
RNA and interacting with the execution environment.

## What can I do with EternaScript?

EternaScript is designed to be flexible, and as such it's ultimately up to your imagination
what you can do with it. However, here are some examples showing a variety of things you can
use EternaScript for:
* <a href="https://eternagame.org/scripts/6232108">My Uncleared Puzzles</a>, a standalone script
that summarizes a players uncleared puzzles
* <a href="https://eternagame.org/scripts/11460252">Generate TSV output for selected design fields</a>,
a standalone script that generates and downloads a TSV containing all designs submitted to a puzzle
including the specified information about the design
* <a href="https://eternagame.org/scripts/6713763">Naive Solver</a>, a booster that automates
puzzle solving through attempting random mutations
* <a href="Mutation Booster with Bulk Sumission">Mutation Booster with Bulk Sumission</a>, a booster
designed for high-throughput labs allowing for automatically generating and submitting small
variations of a sequence
* <a href="https://eternagame.org/scripts/13257357">ArcKnot</a>, a booster which adds custom visualizations
and statistics, particularly focusing on data focused on the ensemble/pairing probabilities.

## How can I learn?

As all EternaScripts are written in JavaScript, you should first gain a basic understanding
of how to write JavaScript programs. Depending on how you learn best, there are different resources
you may want to try:
* Tutorials with extensive interactive components such as the Javascript courses on
<a href="https://www.codecademy.com/learn/introduction-to-javascript">CodeAcademy</a>
or <a href="https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/">FreeCodeCamp</a>
* Video tutorials such as those by <a href="https://www.youtube.com/watch?v=hdI2bqOjy3c">Traversy</a>
or <a href="https://www.youtube.com/watch?v=lI1ae4REbFM">Clever Programmer</a>
* Text-based tutorials such as the ones on <a href="https://javascript.info/">javascript.info</a>
or the <a href="https://developer.mozilla.org/en-US/docs/Learn">Mozilla Developer Network</a>

If you're looking for a reference to look up specific concepts, you'll definitely want to consider
using the <a href="https://developer.mozilla.org/en-US/">MDN Web Docs</a>.

Once you have a basic understanding of JavaScript, you may want to continue this guide or jump
right into reviewing the available [Library Functions](/reference/utility-apis) and [Booster APIs](/reference/booster-apis)
