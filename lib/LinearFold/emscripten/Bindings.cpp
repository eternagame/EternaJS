#include <emscripten.h>
#include <emscripten/bind.h>

#include "FullFold.h"
#include "FullEval.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    register_vector<int>("VectorInt");

    class_<FullEvalResult>("FullEvalResult")
            .constructor()
            .property("nodes", &FullEvalResult::nodes)
            .property("energy", &FullEvalResult::energy);

    function("FullEval", &FullEval, allow_raw_pointers());

    class_<FullFoldResult>("FullFoldResult")
        .property("structure", &FullFoldResult::structure);

    function("FullFoldDefault", &FullFoldDefault, allow_raw_pointers());
}
