#include "EmscriptenUtils.h"

#ifdef __EMSCRIPTEN__

#include <emscripten.h>

// Emits a console.log in js-land
void TraceJS (const char* text) {
    std::string output = "Module.print('(Emscripten) " + std::string(text) + "');";
    emscripten_run_script(output.c_str());
}

#else

void TraceJS (const char* text) {
    printf("(Emscripten) %s", text);
}

#endif

void TraceJS (const std::string& text) {
    TraceJS(text.c_str());
}

std::unique_ptr<char[]> MakeCString (const std::string& string) {
    size_t size = string.size();
    std::unique_ptr<char[]> outString(new char[size + 1]);
    memcpy(outString.get(), string.c_str(), size + 1);

    return outString;
}