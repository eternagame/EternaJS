#include "EmscriptenUtils.h"

#include <emscripten.h>
#include <emscripten/bind.h>

// Emits a console.log in js-land
void TraceJS (const char* text) {
    std::string output = "Module.print('(Emscripten) " + std::string(text) + "');";
    emscripten_run_script(output.c_str());
}

void TraceJS (const std::string& text) {
    TraceJS(text.c_str());
}