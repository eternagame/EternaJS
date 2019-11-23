#ifndef VIENNA2_FULLEVAL_H
#define VIENNA2_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> nodes;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString);

#endif //VIENNA2_FULLEVAL_H
