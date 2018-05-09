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
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

include_directories(.)
include_directories(../emscripten_common)

add_executable(vienna
        alifold.c
        alifold.h
        alipfold.c
        aln_util.c
        aln_util.h
        cofold.c
        cofold.h
        config.h
        dist_vars.c
        dist_vars.h
        duplex.c
        duplex.h
        edit_cost.h
        energy_const.h
        energy_par.c
        energy_par.h
        findpath.c
        findpath.h
        fold.c
        fold.h
        fold_vars.c
        fold_vars.h
        intloops.h
        inverse.c
        inverse.h
        Lfold.c
        Lfold.h
        list.c
        list.h
        LPfold.c
        LPfold.h
        MEA.c
        MEA.h
        naview.c
        pair_mat.h
        params.c
        params.h
        part_func.c
        part_func.h
        part_func_co.c
        part_func_co.h
        part_func_up.c
        part_func_up.h
        ProfileAln.c
        ProfileAln.h
        ProfileDist.c
        profiledist.h
        PS_dot.c
        PS_dot.h
        read_epars.c
        ribo.c
        ribo.h
        RNAstruct.c
        RNAstruct.h
        stringdist.c
        stringdist.h
        subopt.c
        subopt.h
        treedist.c
        treedist.h
        utils.c
        utils.h
        ../emscripten_common/EmscriptenUtils.cpp
        ../emscripten_common/EmscriptenUtils.h
        emscripten/Bindings.cpp
        emscripten/FullEval.cpp
        emscripten/FullEval.h
        emscripten/FullFold.cpp
        emscripten/FullFold.h)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"vienna\"' -s MODULARIZE=1: export our module as 'vienna'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    set_target_properties(vienna PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"vienna\"' -s MODULARIZE=1 --bind -std=c++11 -s WASM=1")
    set_target_properties(vienna PROPERTIES LINK_FLAGS_DEBUG "-O0")
    set_target_properties(vienna PROPERTIES LINK_FLAGS_RELEASE "-O3")
endif ()

