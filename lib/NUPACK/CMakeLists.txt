cmake_minimum_required(VERSION 3.10)
project(nupack)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)
SET(CMAKE_BUILD_TYPE_INIT "Release")
set(CMAKE_CXX_STANDARD 11)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS "-Wall -Wextra")
set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g2")

include_directories(.)
include_directories(./nupack3.0.4)
include_directories(./nupack3.0.4/src/shared/constants)
include_directories(./nupack3.0.4/src/shared)
include_directories(../emscripten_common)

add_executable(nupack
        nupack3.0.4/src/thermo/utils/backtrack.c
        nupack3.0.4/src/thermo/utils/CalculateEnergy.c
        nupack3.0.4/src/thermo/utils/DNAGlobals.c
        nupack3.0.4/src/thermo/utils/ene.c
        nupack3.0.4/src/thermo/utils/GetEnergy.c
        nupack3.0.4/src/shared/hash.c
        nupack3.0.4/src/thermo/utils/init.c
        nupack3.0.4/src/thermo/utils/mfeUtils.c
        nupack3.0.4/src/thermo/utils/min.c
        nupack3.0.4/src/shared/rng/mt19937ar.c
        nupack3.0.4/src/thermo/utils/nsStar.c
        nupack3.0.4/src/thermo/utils/pairsPr.c
        nupack3.0.4/src/thermo/utils/pf.c
        nupack3.0.4/src/thermo/utils/pfuncUtils.c
        nupack3.0.4/src/thermo/utils/pknots.c
        nupack3.0.4/src/thermo/utils/ReadCommandLineNPK.c
        nupack3.0.4/src/thermo/utils/sumexp.c
        nupack3.0.4/src/thermo/utils/sumexp_pk.c
        nupack3.0.4/src/shared/utils.c
        emscripten/Bindings.cpp
        emscripten/Utils.cpp
        emscripten/FullEval.cpp
        emscripten/FullFold.cpp
        emscripten/FullEnsemble.cpp
        ../emscripten_common/EmscriptenUtils.cpp)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"nupack\"' -s MODULARIZE=1: export our module as 'nupack'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s SINGLE_FILE=1: merge all outputs into a single file
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
    #
    # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
    # -s SAFE_HEAP=1
    set_target_properties(nupack PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"nupack\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1 -s STACK_SIZE=5MB -s MAXIMUM_MEMORY=4GB -s EXPORTED_RUNTIME_METHODS='[\"callMain\"]' --embed-file nupack3.0.4/parameters@/")
    set_target_properties(nupack PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(nupack PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS nupack DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
