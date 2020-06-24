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
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g2")

include_directories(.)
include_directories(./LinearFold)
include_directories(./LinearFold/src)
include_directories(./LinearPartition)
include_directories(./LinearPartition/src)
include_directories(../emscripten_common)

SET(LINEARFOLD_FILES
    LinearFold/src/LinearFold.cpp
	LinearPartition/src/LinearPartition.cpp
	#LinearPartition/src/bpp.cpp
    emscripten/Bindings.cpp
    emscripten/FullFold.cpp
    emscripten/FullEval.cpp
    ../emscripten_common/EmscriptenUtils.cpp
)

add_library(LinearFoldBase INTERFACE)
target_compile_definitions(LinearFoldBase
    INTERFACE is_cube_pruning
    INTERFACE is_candidate_list
)

add_executable(LinearFoldV ${LINEARFOLD_FILES})
target_link_libraries(LinearFoldV LinearFoldBase)
target_compile_definitions(LinearFoldV PUBLIC lv lpv)

add_executable(LinearFoldC ${LINEARFOLD_FILES})
target_link_libraries(LinearFoldC LinearFoldBase)

# sloppy, but enables build from either path. there's probably something smart
# we could do with cmake relative paths.
if (EXISTS "../EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
  message(STATUS "Found EternaFold parameters and building LinearFoldE variant")
  add_executable(LinearFoldE ${LINEARFOLD_FILES})
  target_link_libraries(LinearFoldE LinearFoldBase)
  target_compile_definitions(LinearFoldE PUBLIC le)
elseif (EXISTS "EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
  message(STATUS "Found EternaFold parameters and building LinearFoldE variant")
  add_executable(LinearFoldE ${LINEARFOLD_FILES})
  target_link_libraries(LinearFoldE LinearFoldBase)
  target_compile_definitions(LinearFoldE PUBLIC le)
else()
  message(STATUS "EternaFold parameters not found; LinearFoldE not active")
endif()

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
  set(BASE_LINK_FLAGS "-s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1")
  set_target_properties(LinearFoldV    PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"LinearFoldV\"' ${BASE_LINK_FLAGS}")
  set_target_properties(LinearFoldC    PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"LinearFoldC\"' ${BASE_LINK_FLAGS}")
  if (EXISTS "../EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
    set_target_properties(LinearFoldE    PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"LinearFoldE\"' ${BASE_LINK_FLAGS}")
  elseif (EXISTS "EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
    set_target_properties(LinearFoldE    PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"LinearFoldE\"' ${BASE_LINK_FLAGS}")
  endif()
  set_target_properties(LinearFoldBase PROPERTIES INTERFACE_LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
  set_target_properties(LinearFoldBase PROPERTIES INTERFACE_LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS LinearFoldV LinearFoldC DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
if (EXISTS "../EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
  install(TARGETS LinearFoldE DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
elseif (EXISTS "EternaFold/EternaFold/parameters/LinearFold/feature_weight_e.h")
  install(TARGETS LinearFoldE DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
endif()
