#!/usr/bin/env bash

emcc -O2 --bind hello_world.cpp -o hello_world.js -s 'EXPORT_NAME="HelloWorld"' -s MODULARIZE=1
