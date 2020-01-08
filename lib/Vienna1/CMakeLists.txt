cmake_minimum_required(VERSION 3.10)
project(vienna)

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
include_directories(./ViennaRNA-1.8.5)
include_directories(./ViennaRNA-1.8.5/H)
include_directories(../emscripten_common)

add_executable(vienna
        ViennaRNA-1.8.5/lib/alifold.c
        ViennaRNA-1.8.5/lib/alipfold.c
        ViennaRNA-1.8.5/lib/aln_util.c
        ViennaRNA-1.8.5/lib/cofold.c
        ViennaRNA-1.8.5/lib/dist_vars.c
        ViennaRNA-1.8.5/lib/duplex.c
        ViennaRNA-1.8.5/lib/energy_par.c
        ViennaRNA-1.8.5/lib/findpath.c
        ViennaRNA-1.8.5/lib/fold.c
        ViennaRNA-1.8.5/lib/fold_vars.c
        ViennaRNA-1.8.5/lib/inverse.c
        ViennaRNA-1.8.5/lib/Lfold.c
        ViennaRNA-1.8.5/lib/list.c
        ViennaRNA-1.8.5/lib/LPfold.c
        ViennaRNA-1.8.5/lib/MEA.c
        ViennaRNA-1.8.5/lib/naview.c
        ViennaRNA-1.8.5/lib/params.c
        ViennaRNA-1.8.5/lib/part_func.c
        ViennaRNA-1.8.5/lib/part_func_co.c
        ViennaRNA-1.8.5/lib/part_func_up.c
        ViennaRNA-1.8.5/lib/ProfileAln.c
        ViennaRNA-1.8.5/lib/ProfileDist.c
        ViennaRNA-1.8.5/lib/PS_dot.c
        ViennaRNA-1.8.5/lib/read_epars.c
        ViennaRNA-1.8.5/lib/ribo.c
        ViennaRNA-1.8.5/lib/RNAstruct.c
        ViennaRNA-1.8.5/lib/stringdist.c
        ViennaRNA-1.8.5/lib/subopt.c
        ViennaRNA-1.8.5/lib/treedist.c
        ViennaRNA-1.8.5/lib/utils.c
        ../emscripten_common/EmscriptenUtils.cpp
        emscripten/Bindings.cpp
        emscripten/FullEval.cpp
        emscripten/FullFold.cpp)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"vienna\"' -s MODULARIZE=1: export our module as 'vienna'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s SINGLE_FILE=1: merge all outputs into a single file
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
    #
    # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
    # -s SAFE_HEAP=1
    set_target_properties(vienna PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"vienna\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1")
    set_target_properties(vienna PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(vienna PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS vienna DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
