cmake_minimum_required(VERSION 3.10)
project(rnapuzzler)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)
SET(CMAKE_BUILD_TYPE_INIT "Release")
set(CMAKE_CXX_STANDARD 11)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS "-Wall -Wextra -I/Users/andrewwatkins/programs/emsdk/upstream/emscripten/system/include")
set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g2")

include_directories(.)
include_directories(./RNApuzzler)
include_directories(./RNApuzzler/src)
include_directories(./libsvm-2.91)
include_directories(../emscripten_common)

add_executable(rnapuzzler
		RNApuzzler/src/ViennaRNA/utils.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/RNAturtle.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/#RNApuzzler.c#
		RNApuzzler/src/ViennaRNA/RNApuzzler/intersectLevel/intersectLevelTreeNodes.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/intersectLevel/intersectLevelLines.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/intersectLevel/intersectLevelBoundingBoxes.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/handleAncestorIntersections.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/resolveIntersections.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/boundingWedge.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/intersectionType.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/resolveExteriorChildIntersections.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/calcDeltas.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/optimize.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/rotationAngle.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/handleSiblingIntersections.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/resolveIntersections/handleConfigChanges.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/vector_math.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/postscript/postscriptArcs.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/output/configtree_debug.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/output/GeoGebra_output.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/output/output.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/data/cfg_reader.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/data/configtree.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/data/boundingBoxes.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/definitions.c
		RNApuzzler/src/ViennaRNA/RNApuzzler/RNApuzzler.c
        #ViennaRNA-2.1.8/lib/2Dfold.c
        #ViennaRNA-2.1.8/lib/2Dpfold.c
        #ViennaRNA-2.1.8/lib/ali_plex.c
        #ViennaRNA-2.1.8/lib/alifold.c
        #ViennaRNA-2.1.8/lib/aliLfold.c
        #ViennaRNA-2.1.8/lib/alipfold.c
        #ViennaRNA-2.1.8/lib/aln_util.c
        #ViennaRNA-2.1.8/lib/c_plex.c
        #ViennaRNA-2.1.8/lib/cofold.c
        #ViennaRNA-2.1.8/lib/convert_epars.c
        #ViennaRNA-2.1.8/lib/dist_vars.c
        #ViennaRNA-2.1.8/lib/duplex.c
        #ViennaRNA-2.1.8/lib/energy_par.c
        #ViennaRNA-2.1.8/lib/findpath.c
        #ViennaRNA-2.1.8/lib/fold.c
        #ViennaRNA-2.1.8/lib/fold_vars.c
        #ViennaRNA-2.1.8/lib/gquad.c
        #ViennaRNA-2.1.8/lib/inverse.c
        #ViennaRNA-2.1.8/lib/Lfold.c
        #ViennaRNA-2.1.8/lib/list.c
        #ViennaRNA-2.1.8/lib/LPfold.c
        #ViennaRNA-2.1.8/lib/MEA.c
        #ViennaRNA-2.1.8/lib/mm.c
        #ViennaRNA-2.1.8/lib/move_set.c
        #ViennaRNA-2.1.8/lib/naview.c
        #ViennaRNA-2.1.8/lib/params.c
        #ViennaRNA-2.1.8/lib/part_func.c
        #ViennaRNA-2.1.8/lib/part_func_co.c
        #ViennaRNA-2.1.8/lib/part_func_up.c
        #ViennaRNA-2.1.8/lib/plex.c
        #ViennaRNA-2.1.8/lib/plex_functions.c
        #ViennaRNA-2.1.8/lib/plot_layouts.c
        #ViennaRNA-2.1.8/lib/ProfileAln.c
        #ViennaRNA-2.1.8/lib/ProfileDist.c
        #ViennaRNA-2.1.8/lib/PS_dot.c
        #ViennaRNA-2.1.8/lib/read_epars.c
        #ViennaRNA-2.1.8/lib/ribo.c
        #ViennaRNA-2.1.8/lib/RNAstruct.c
        #ViennaRNA-2.1.8/lib/snofold.c
        #ViennaRNA-2.1.8/lib/snoop.c
        #ViennaRNA-2.1.8/lib/stringdist.c
        #ViennaRNA-2.1.8/lib/subopt.c
        #ViennaRNA-2.1.8/lib/treedist.c
        #ViennaRNA-2.1.8/lib/utils.c
        ../emscripten_common/EmscriptenUtils.cpp
		emscripten/GetLayout.cpp
	    emscripten/Bindings.cpp)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"rnapuzzler\"' -s MODULARIZE=1: export our module as 'rnapuzzler'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s SINGLE_FILE=1: merge all outputs into a single file
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
    #
    # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
    # -s SAFE_HEAP=1
    set_target_properties(rnapuzzler PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"rnapuzzler\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1")
    set_target_properties(rnapuzzler PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(rnapuzzler PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS rnapuzzler DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
