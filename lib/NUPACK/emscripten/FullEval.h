#ifndef NUPACK_FULLEVAL_H
#define NUPACK_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> nodes;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString);

#endif //NUPACK_FULLEVAL_H
