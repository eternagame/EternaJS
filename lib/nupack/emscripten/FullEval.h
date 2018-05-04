#ifndef NUPACK_FULLEVAL_H
#define NUPACK_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> energyContributions;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, std::string string_in, std::string structure_in);

#endif //NUPACK_FULLEVAL_H
