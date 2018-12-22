#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

#include "FullEval.h"
#include "EmscriptenUtils.h"
#include "LinearFoldEval.cpp"

FullEvalResult* FullEval (std::string seqString, std::string structString) {
    FullEvalResult* result = new FullEvalResult();

    result->energy = eval(seqString, structString) / -100.0;
    return result;
}
