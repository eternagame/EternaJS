#ifndef NUPACK_TRACEJS_H
#define NUPACK_TRACEJS_H

#include <string>
#include <memory>

void TraceJS (const char* text);
void TraceJS (const std::string& text);

std::unique_ptr<char[]> MakeCString (const std::string& string);

#endif //NUPACK_TRACEJS_H
