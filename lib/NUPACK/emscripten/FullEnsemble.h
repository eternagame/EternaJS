#ifndef NUPACK_FULLENSEMBLE_H
#define NUPACK_FULLENSEMBLE_H

#include <string>
#include <vector>


struct FullAdvancedResult {
    double ensembleDefect;
    std::vector<std::string> subopt_structures;
    std::vector<std::string> subopt_energyError;
    std::vector<std::string> subopt_freeEnergy;
};

FullAdvancedResult* FullEnsembleNoBindingSite (const std::string& seqString, int temperature, float kcal_delta_range_mfe_subopt, bool const pseudoknotted);

#endif //NUPACK_FULLENSEMBLE_H
