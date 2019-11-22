#ifndef VIENNA_FULLEVAL_H
#define VIENNA_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> nodes;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString);

#endif //VIENNA_FULLEVAL_H
