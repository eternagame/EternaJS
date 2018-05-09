#ifndef EMSCRIPTEN_UTILS_H
#define EMSCRIPTEN_UTILS_H

#include <string>
#include <memory>

void TraceJS (const char* text);
void TraceJS (const std::string& text);

std::unique_ptr<char[]> MakeCString (const std::string& string);

#endif //EMSCRIPTEN_UTILS_H
