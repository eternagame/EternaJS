#include <emscripten.h>
#include <emscripten/bind.h>

#include "FullFold.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    class_<FullFoldResult>("FullFoldResult")
        .property("structure", &FullFoldResult::structure);

    function("FullFoldDefault", &FullFoldDefault, allow_raw_pointers());
}
