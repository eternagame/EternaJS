cmake_minimum_required(VERSION 3.10)
project(cdsfold)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)
SET(CMAKE_BUILD_TYPE_INIT "Release")
set(CMAKE_CXX_STANDARD 17)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# ViennaRNA installation path (built with Emscripten)
# Override via: cmake -D VIENNA_INSTALL=/path/to/install-wasm ..
# or set the VIENNA_INSTALL environment variable
if(NOT DEFINED VIENNA_INSTALL)
    if(DEFINED ENV{VIENNA_INSTALL})
        set(VIENNA_INSTALL $ENV{VIENNA_INSTALL})
    else()
        set(VIENNA_INSTALL ${CMAKE_CURRENT_SOURCE_DIR}/CDSfold_SU/ViennaRNA-2.4.9/install-wasm)
    endif()
endif()

message(STATUS "CDSfold: using ViennaRNA from ${VIENNA_INSTALL}")

set(CMAKE_CXX_FLAGS "-Wall -Wextra -DUSE_VIENNA_ENERGY_MODEL")
set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g2")

include_directories(CDSfold_SU/src)
include_directories(${VIENNA_INSTALL}/include/ViennaRNA)
include_directories(${VIENNA_INSTALL}/include)

add_executable(cdsfold
        CDSfold_SU/src/AASeqConverter.cpp
        CDSfold_SU/src/Problem.cpp
        CDSfold_SU/src/Util.cpp
        CDSfold_SU/src/ViennaEnergyModel.cpp
        CDSfold_SU/src/codon.cpp
        CDSfold_SU/src/fasta.cpp
        CDSfold_SU/src/FileManager.cpp
        emscripten/Bindings.cpp)

target_link_libraries(cdsfold "${VIENNA_INSTALL}/lib/libRNA.a")

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"CDSfoldModule\"' -s MODULARIZE=1: export our module as 'CDSfoldModule'
    # -s WASM=1: wasm enabled
    # -s SINGLE_FILE=1: merge all outputs into a single file
    # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
    # -s FILESYSTEM=0: no filesystem needed
    # -s ENVIRONMENT='web,worker': target browser and web worker contexts
    #
    # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
    # -s SAFE_HEAP=1
    set_target_properties(cdsfold PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"CDSfoldModule\"' -s MODULARIZE=1 --bind -std=c++17 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=67108864 -s MAXIMUM_MEMORY=2147483648 -s NO_EXIT_RUNTIME=1 -s FILESYSTEM=0 -s STACK_SIZE=5MB -s ENVIRONMENT='web,worker'")
    set_target_properties(cdsfold PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(cdsfold PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS cdsfold DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
