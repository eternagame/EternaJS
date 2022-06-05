#ifndef NUPACK_FULLENSEMBLE_H
#define NUPACK_FULLENSEMBLE_H

#include <string>
#include <vector>


struct FullAdvancedResult {
    double ensembleDefect;
    std::vector<std::string> suboptStructures;
    std::vector<double> suboptEnergyError;
    std::vector<double> suboptFreeEnergy;
};

FullAdvancedResult* FullEnsembleNoBindingSite (const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted);
FullAdvancedResult* FullEnsembleWithOligos (const std::string& seqString, int temperature, float kcalDeltaRange,  bool const pseudoknotted);

#endif //NUPACK_FULLENSEMBLE_H
