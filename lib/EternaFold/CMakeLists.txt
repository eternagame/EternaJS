cmake_minimum_required(VERSION 3.10)
project(eternafold)

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

add_executable(eternafold
        #EternaFold/src/Contrafold.cpp
		EternaFold/src/EncapsulatedPostScript.cpp
        EternaFold/src/FileDescription.cpp
	#EternaFold/src/MakeCoords.cpp
        EternaFold/src/Options.cpp
	#EternaFold/src/PlotRNA.cpp
	#EternaFold/src/ScorePrediction.cpp
        EternaFold/src/SStruct.cpp
        EternaFold/src/Utilities.cpp
        EternaFold/src/BundleMethod.ipp
        EternaFold/src/CGLinear.ipp
        EternaFold/src/CGOptimizationWrapper.ipp
        EternaFold/src/ComputationEngine.ipp
        EternaFold/src/ComputationWrapper.ipp
        EternaFold/src/Defaults.ipp
        EternaFold/src/DistributedComputation.ipp
        EternaFold/src/InferenceEngine.ipp
        EternaFold/src/InnerOptimizationWrapperBundleMethod.ipp
        EternaFold/src/InnerOptimizationWrapper.ipp
        EternaFold/src/InnerOptimizationWrapperLBFGS.ipp
        EternaFold/src/InnerOptimizationWrapperSubgradientMethod.ipp
        EternaFold/src/InnerOptimizationWrapperViterbi.ipp
        EternaFold/src/LBFGS.ipp
        EternaFold/src/LineSearch.ipp
        EternaFold/src/OptimizationWrapper.ipp
        EternaFold/src/OuterOptimizationWrapper.ipp
        EternaFold/src/SparseMatrix.ipp
        EternaFold/src/SubgradientMethod.ipp
        EternaFold/src/Utilities.ipp
		emscripten/nnfe_eval.cpp
	#contrafold/src/ParameterManager.hpp
        emscripten/Bindings.cpp
        emscripten/FullEval.cpp
	#emscripten/FullFold.cpp
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
    set_target_properties(eternafold PROPERTIES LINK_FLAGS "-s 'EXPORT_NAME=\"eternafold\"' -s MODULARIZE=1 --bind -std=c++11 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1 -s STACK_SIZE=5MB --embed-file EternaFold/parameters@/")
    set_target_properties(eternafold PROPERTIES LINK_FLAGS_DEBUG "-O0 -s WASM=0 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=2 -s SAFE_HEAP=1")
    set_target_properties(eternafold PROPERTIES LINK_FLAGS_RELEASE "-O3 -s WASM=1")
endif ()

install(TARGETS eternafold DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../src/eterna/folding/engines)
