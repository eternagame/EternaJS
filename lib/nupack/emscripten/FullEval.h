#ifndef NUPACK_FULLEVAL_H
#define NUPACK_FULLEVAL_H

#include <vector>
#include <string>

struct FullEvalResult {
    std::vector<int> energyContributions;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, const std::string& string_in, const std::string& structure_in);

#endif //NUPACK_FULLEVAL_H
