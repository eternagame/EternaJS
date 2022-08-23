#ifndef NUPACK_FULLENSEMBLE_H
#define NUPACK_FULLENSEMBLE_H

#include <string>
#include <vector>
#include "src/thermo/utils/pfuncUtilsHeader.h"

struct FullAdvancedResult {    
    std::vector<std::string> suboptStructures;
    std::vector<double> suboptEnergyError;
    std::vector<double> suboptFreeEnergy;
};

struct FullEnsembleDefectResult {
    double ensembleDefect;    
    double ensembleDefectNormalized;
    //std::string testString;
    //std::vector<int> testvector;  
};

FullAdvancedResult* FullEnsembleNoBindingSite (const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted);
FullAdvancedResult* FullEnsembleWithOligos (const std::string& seqString, int temperature, float kcalDeltaRange,  bool const pseudoknotted);
FullEnsembleDefectResult* GetEnsembleDefect(const std::string& seqString, const std::string& MfeStructure, int temperature, bool pseudoknot);

#endif //NUPACK_FULLENSEMBLE_H
