cmake_minimum_required(VERSION 3.10)
project(nupack)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)
SET(CMAKE_BUILD_TYPE_INIT "Release")
set(CMAKE_CXX_STANDARD 11)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")
endif ()

include_directories(.)
include_directories(/export/emsdk/emscripten/1.37.39/system/include)

add_executable(nupack
        backtrack.c
        CalculateEnergy.c
        DNAExternals.h
        DNAGlobals.c
        ene.c
        GetEnergy.c
        hash.c
        hash.h
        init.c
        mfeUtils.c
        min.c
        mt19937ar.c
        mt19937ar.h
        nsStar.c
        pairsPr.c
        pf.c
        pfuncUtils.c
        pfuncUtilsConstants.h
        pfuncUtilsHeader.h
        physical_constants.h
        pknots.c
        ReadCommandLineNPK.c
        runtime_constants.h
        sumexp.c
        sumexp_pk.c
        utils.c
        utilsHeader.h
        emscripten/FullEval.cpp
        emscripten/FullEval.h
        emscripten/Bindings.cpp
        emscripten/EmscriptenUtils.cpp
        emscripten/EmscriptenUtils.h
        emscripten/FullFold.cpp
        emscripten/FullFold.h)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set_target_properties(nupack PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"nupack\"' -s MODULARIZE=1 --bind -O0 -std=c++11")
endif ()
