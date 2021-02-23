# EternaJS 2 Skeleton Code

## High-level Overview
This is intended to be a highly-volatile exploration for design/architecture decisions for
EternaJS version 2. The code is a sandbox for ideas and fast iteration, and has the potential
to serve as a blueprint for what the final implementation will look like.

## Package Overview
The current plan is for EternaJS 2 to be a monorepo with a number of seperable packages
that could be independantly useful. The current tsconfig is set up with a path aliasing mechanism,
but this isn't so much intended to represent how it will ulimately be implemented so much as
for convinience for referencing parts of other packages without a more complete build system setup
(though maybe it'll look like this - we'll see!). The purpose of the packages are as follows:

- designer: The core application, simply known as "EternaJS" in EternaJS v1. The name change
  represents the retargeting of the application to be purely a base design application, without
  the functionality specific to the Eterna "game"/citizen science platform (to allow for easier
  retargeting to other scenarios like professional design, NOVA Labs, or other future partnerships). 
- flashbang: Game library, derived from a Flash/ActionScript library developed by
  [Tim Conkling](https://github.com/tconkling/flashbang-starling) (originally
  [threerings](https://github.com/threerings/flashbang)). This will likely remain largely unchanged
  from the current version in EternaJS v1.
- signals: A signals/slots/FRP library for event/state manegement, derived from a Flash/ActionScript
  library developed by [Tim Conkling](https://github.com/tconkling/react-as3) (originally a
  Java/Objective C library by [threerings](https://github.com/threerings/react)). This will likely
  remain largely unchanged from the current version in EternaJS v1. It is also possible we may opt
  to use some other state management library
- rna: Basic data structures and utilities for working with RNA
- folding: Isomorphic wrapper for working with various RNA folding engines/energy models
- rnavis: Pixi-based visualizations of RNA molecules
- eternascript: Execution environment for userscripts and custom extensions run within the
  designer application and Eterna website
