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

struct FullDefectResult {
    double ensembleDefect;
    double ensembleDefectNormalized;
    double mfeDefect;
    double mfeDefectNormalized;
};

struct Defect {

    double ensembleDefect;
    double ensembleDefectNormalized;
    double mfeDefect;
    double mfeDefectNormalized;
    
};

FullAdvancedResult* FullEnsembleNoBindingSite (const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted);
FullAdvancedResult* FullEnsembleWithOligos (const std::string& seqString, int temperature, float kcalDeltaRange,  bool const pseudoknotted);
FullDefectResult* FullEnsembleDefect( const std::string& seqString, const std::string& MfeStructure, int temperature, 
                                      bool const pseudoknotted, int const mode);
Defect GetEnsembleDefect(char* seqChar, char* dotParensStructure, int temperature, bool pseudoknot, bool multiFold, bool doEDefect, bool doMfeDefect);

#endif //NUPACK_FULLENSEMBLE_H
