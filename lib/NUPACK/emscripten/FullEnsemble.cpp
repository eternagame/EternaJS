#include "FullEnsemble.h"
#include "EmscriptenUtils.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"
#include <vector>
#include <utility>
#include <string> 


FullAdvancedResult* FullEnsembleNoBindingSite(const std::string& seqString, int temperature, float kcal_delta_range_mfe_subopt, bool const pseudoknotted = false)
{

    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength = strlen(string);
    dnaStructures suboptStructs = {NULL, 0, 0, 0, 0};

    convertSeq(string, seqNum, tmpLength);
    //first get teh ensemble through subopt
    if ( pseudoknotted ) {
        mfeFullWithSym_SubOpt(seqNum, tmpLength, &suboptStructs, 5, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcal_delta_range_mfe_subopt, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym_SubOpt(seqNum, tmpLength, &suboptStructs, 3, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcal_delta_range_mfe_subopt, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }

    //initialize the result to return
    FullAdvancedResult* result = new FullAdvancedResult();
    
    
    //get dot bracket notation from data 
    for(int i = 0; i < suboptStructs.nStructs; i++) {
        //each structure reset this
        std::string singlestructure = "";             
        for(int j = 0; j < suboptStructs.seqlength; j++) {
            if(suboptStructs.validStructs[i].theStruct[j] > j) {
                singlestructure.push_back('(');
            }
            else if(suboptStructs.validStructs[i].theStruct[j] == -1 ) {
                singlestructure.push_back('.');
            }
            else singlestructure.push_back(')');
        }  
        //get energies
        std::string energyError = std::to_string(suboptStructs.validStructs[i].error);
        std::string correctedEnergy = std::to_string(suboptStructs.validStructs[i].correctedEnergy);  
        

        //write out data
        result-> subopt_structures.push_back(singlestructure);
        result-> subopt_energyError.push_back(energyError);
        result-> subopt_freeEnergy.push_back(correctedEnergy);
    }

    clearDnaStructures(&suboptStructs);

    //get defect here later for now popuolate with 0
    result -> ensembleDefect=0;


    return result;
}

