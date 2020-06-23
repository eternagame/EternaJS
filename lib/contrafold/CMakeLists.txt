cmake_minimum_required(VERSION 3.10)
project(contrafold)

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
include_directories(./contrafold)
include_directories(./contrafold/src/)
include_directories(../emscripten_common)

add_executable(contrafold
        #contrafold/src/Contrafold.cpp
        contrafold/src/EncapsulatedPostScript.cpp
        contrafold/src/FileDescription.cpp
	#contrafold/src/MakeCoords.cpp
        contrafold/src/Options.cpp
	#contrafold/src/PlotRNA.cpp
	#contrafold/src/ScorePrediction.cpp
        contrafold/src/SStruct.cpp
        contrafold/src/Utilities.cpp
        contrafold/src/BundleMethod.ipp
        contrafold/src/CGLinear.ipp
        contrafold/src/CGOptimizationWrapper.ipp
        contrafold/src/ComputationEngine.ipp
        contrafold/src/ComputationWrapper.ipp
        contrafold/src/Defaults.ipp
        contrafold/src/DistributedComputation.ipp
        contrafold/src/InferenceEngine.ipp
        contrafold/src/InnerOptimizationWrapperBundleMethod.ipp
        contrafold/src/InnerOptimizationWrapper.ipp
        contrafold/src/InnerOptimizationWrapperLBFGS.ipp
        contrafold/src/InnerOptimizationWrapperSubgradientMethod.ipp
        contrafold/src/InnerOptimizationWrapperViterbi.ipp
        contrafold/src/LBFGS.ipp
        contrafold/src/LineSearch.ipp
        contrafold/src/OptimizationWrapper.ipp
        contrafold/src/OuterOptimizationWrapper.ipp
        contrafold/src/SparseMatrix.ipp
        contrafold/src/SubgradientMethod.ipp
        contrafold/src/Utilities.ipp
        emscripten/nnfe_eval.cpp
	#contrafold/src/ParameterManager.hpp
        emscripten/Bindings.cpp
        emscripten/FullEval.cpp
        ../emscripten_common/EmscriptenUtils.cpp)

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CMAKE_C_COMPILER "emcc")

    # -s 'EXPORT_NAME=\"contrafold\"' -s MODULARIZE=1: export our module as 'contrafold'
    # --preload-file assets@/ : map all files inside the 'assets' folder to / in the virtual FS
    # -s WASM=1: wasm enabled
    # -s SINGLE_FILE=1: merge all outputs into a single file
    # -s LEGACY_VM_SUPPORT=1: support IE11 (incompatible with WASM=1)
    # -s ALLOW_MEMORY_GROWTH=1: allow the malloc pool to grow at runtime
    #
    # Debugging tools (see https://github.com/kripken/emscripten/blob/master/src/settings.js):
    # -s SAFE_HEAP=1
    set_target_properties(contrafold PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"contrafold\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1 ")
    set_target_properties(contrafold PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(contrafold PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS contrafold DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
