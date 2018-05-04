#!/usr/bin/env bash

em++ -O3 --bind -s 'EXPORT_NAME="nupack"' -s MODULARIZE=1 --std=c++11 \
    -o nupack.js \
    backtrack.c \
    CalculateEnergy.c \
    DNAGlobals.c \
    ene.c \
    GetEnergy.c \
    hash.c \
    init.c \
    mfeUtils.c \
    min.c \
    mt19937ar.c \
    nsStar.c \
    pairsPr.c \
    pf.c \
    pfuncUtils.c \
    pknots.c \
    ReadCommandLineNPK.c \
    sumexp.c \
    utils.c \
    emscripten/Bindings.cpp \
    emscripten/EmscriptenUtils.cpp \
    emscripten/FullEval.cpp
