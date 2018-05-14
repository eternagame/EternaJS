cmake_minimum_required(VERSION 3.10)
project(vrna2)

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

add_executable(vrna2
        1.8.4_epars.h
        1.8.4_intloops.h
        2Dfold.c
        2Dfold.h
        2Dpfold.c
        2Dpfold.h
        ali_plex.c
        ali_plex.h
        alifold.c
        alifold.h
        aliLfold.c
        alipfold.c
        aln_util.c
        aln_util.h
        c_plex.c
        cofold.c
        cofold.h
        config.h
        convert_epars.c
        convert_epars.h
        data_structures.h
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
        gquad.c
        gquad.h
        intl11.h
        intl11dH.h
        intl21.h
        intl21dH.h
        intl22.h
        intl22dH.h
        inverse.c
        inverse.h
        Lfold.c
        Lfold.h
        list.c
        list.h
        loop_energies.h
        LPfold.c
        LPfold.h
        MEA.c
        MEA.h
        mm.c
        mm.h
        move_set.c
        move_set.h
        naview.c
        naview.h
        pair_mat.h
        params.c
        params.h
        part_func.c
        part_func.h
        part_func_co.c
        part_func_co.h
        part_func_up.c
        part_func_up.h
        PKplex.h
        plex.c
        plex.h
        plex_functions.c
        plot_layouts.c
        plot_layouts.h
        ProfileAln.c
        ProfileAln.h
        ProfileDist.c
        profiledist.h
        PS_dot.c
        PS_dot.h
        read_epars.c
        read_epars.h
        ribo.c
        ribo.h
        RNAstruct.c
        RNAstruct.h
        snofold.c
        snofold.h
        snoop.c
        snoop.h
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
        emscripten/FullFold.cpp
        emscripten/FullFold.h
        emscripten/FullEval.cpp
        emscripten/FullEval.h emscripten/Bindings.cpp)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"vrna2\"' -s MODULARIZE=1: export our module as 'vrna2'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    set_target_properties(vrna2 PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"vrna2\"' -s MODULARIZE=1 --bind -std=c++11 -s WASM=1")
    set_target_properties(vrna2 PROPERTIES LINK_FLAGS_DEBUG "-O0")
    set_target_properties(vrna2 PROPERTIES LINK_FLAGS_RELEASE "-O3")
endif ()
