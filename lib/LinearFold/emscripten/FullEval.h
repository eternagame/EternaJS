#ifndef LINEARFOLD_FULLEVAL_H
#define LINEARFOLD_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> nodes;
    double energy;
};

FullEvalResult* FullEval (const std::string& seqString, const std::string& structString);

#endif //LINEARFOLD_FULLEVAL_H
