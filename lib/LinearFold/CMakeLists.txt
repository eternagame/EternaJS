##cmake_minimum_required(VERSION 3.6)
#project(fastcky)
#
#if($ENV{CXX})
#  set(CMAKE_CXX_COMPILER $ENV{CXX} CACHE FILEPATH "CXX Compiler")
#endif()
#if($ENV{CC})
#  set(CMAKE_CC_COMPILER $ENV{CC} CACHE FILEPATH "CC Compiler")
#endif()
#
#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -O3")
#
## set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -lprofiler")
## set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -ltcmalloc -fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free")
#
#set(BEAMCKYPAR_SOURCE
#        beamckypar.cpp
#        beamckypar.h
#        fastcky_w.h
#        utility.h
#        cxxopts.hpp)
#
#add_executable(linearfold ${BEAMCKYPAR_SOURCE})

cmake_minimum_required(VERSION 3.10)
project(LinearFold)

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

add_executable(LinearFold
        beamckypar.cpp
        beamckypar.h
        fastcky_w.h
        utility.h
        cxxopts.hpp
        emscripten/Bindings.cpp
        emscripten/FullFold.cpp
        emscripten/FullFold.h
        ../emscripten_common/EmscriptenUtils.cpp
        ../emscripten_common/EmscriptenUtils.h)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
  set(CMAKE_C_COMPILER "emcc")

  # -s 'EXPORT_NAME=\"LinearFold\"' -s MODULARIZE=1: export our module as 'LinearFold'
  # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
  # -s WASM=1: wasm enabled
  # -s SINGLE_FILE=1: merge all outputs into a single file
  # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
  # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
  #
  # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
  # -s SAFE_HEAP=1
  set_target_properties(LinearFold PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"LinearFold\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1")
  set_target_properties(LinearFold PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
  set_target_properties(LinearFold PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()
