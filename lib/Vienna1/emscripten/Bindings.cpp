#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include <emscripten/bind.h>

#include "FullEval.h"
#include "FullFold.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    register_vector<int>("VectorInt");
    register_vector<double>("VectorDouble");

    class_<FullEvalResult>("FullEvalResult")
        .constructor()
        .property("nodes", &FullEvalResult::nodes)
        .property("energy", &FullEvalResult::energy);

    function("FullEval", &FullEval, allow_raw_pointers());

    class_<FullFoldResult>("FullFoldResult")
        .property("mfe", &FullFoldResult::mfe)
        .property("structure", &FullFoldResult::structure);

    function("FullFoldDefault", &FullFoldDefault, allow_raw_pointers());
    function("FullFoldTemperature", &FullFoldTemperature, allow_raw_pointers());
    function("FullFoldWithBindingSite", &FullFoldWithBindingSite, allow_raw_pointers());
    function("CoFoldSequence", &CoFoldSequence, allow_raw_pointers());
    function("CoFoldSequenceWithBindingSite", &CoFoldSequenceWithBindingSite, allow_raw_pointers());

    class_<DotPlotResult>("DotPlotResult")
        .property("energy", &DotPlotResult::energy)
        .property("probabilitiesString", &DotPlotResult::probabilitiesString);

    function("GetDotPlot", &GetDotPlot, allow_raw_pointers());
}

#else

#include <iostream>
#include "FullFold.h"

int main () {
    std::cout << "Hello World!";
    const std::string SEQ = "AAAAAAAAAAAAAA";
    const std::string STRUCT = "";
    FullFoldResult* result = FullFoldDefault(SEQ, "");

    delete result;
}

#endif