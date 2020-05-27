#include <emscripten.h>
#include <emscripten/bind.h>

#include "GetLayout.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    register_vector<int>("VectorInt");
    register_vector<short>("VectorShort");
    register_vector<double>("VectorDouble");

    class_<LayoutResult>("LayoutResult")
        .property("xs", &LayoutResult::xs)
        .property("ys", &LayoutResult::ys);

    function("GetLayout", &GetLayout, allow_raw_pointers());
    
}
