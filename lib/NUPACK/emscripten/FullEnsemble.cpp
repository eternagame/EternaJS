#include <vector>
#include <utility>
#include <string> 

#include "FullEnsemble.h"
#include "EmscriptenUtils.h"
#include "Utils.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"

//variables for ensemble defect
extern DBL_TYPE *pairPrPbg;  //for pseudoknots
extern DBL_TYPE *pairPrPb;  //for pseudoknots

extern double CUTOFF;
extern int Multistranded;

FullAdvancedResult* FullEnsembleWithOligos(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false) {

    //this chuck of code sets up the variables used to represent adn configure the sequence for the C code to use
    SequenceStructureInfo rna_info = SequenceStructureInfo();
    setSequenceInfo(seqString, &rna_info);
  
    //first get the ensemble through subopt
    if ( rna_info.isPknot==TRUE ) {
        mfeFullWithSym_SubOpt(rna_info.sequenceNumber, rna_info.sequenceLength, &rna_info.ensemebleStructs, 5, RNA, 1 /*DANGLETYPE*/, 
                                rna_info.temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym_SubOpt(rna_info.sequenceNumber, rna_info.sequenceLength, &rna_info.ensemebleStructs, 3, RNA, 1 /*DANGLETYPE*/, 
                                rna_info.temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }


    //now process the results for return to TS
    //initialize the result to return
    FullAdvancedResult* result = new FullAdvancedResult();
    
    int i, j;
    //get dot bracket notation from data 
    for (i = 0; i < rna_info.ensemebleStructs.nStructs; i++ ) {
        oneDnaStruct currentStruct = rna_info.ensemebleStructs.validStructs[i];

        //each structure reset this
        std::string singlestructure = "";             
        for (j = 0; j < rna_info.ensemebleStructs.seqlength; j++ ) {
            if ( currentStruct.theStruct[j] > j ) {
                singlestructure.push_back('(');
            }
            else if ( currentStruct.theStruct[j] == -1 ) {
                singlestructure.push_back('.');
            }
            else singlestructure.push_back(')');
        }  

        char* pc;
        std::string constraints = singlestructure;
        for (pc = rna_info.sequenceChar, i = 0, j = 0; (*pc); pc++, j++) {
            auto value = ((*pc) == '+' ? '&' : constraints[i++]);
            if (j < singlestructure.length()) {
                singlestructure[j] = value;
            } else {
                singlestructure.push_back(value);
            }
        }

        //get energies
        double energyError = currentStruct.error;
        double correctedEnergy = currentStruct.correctedEnergy;  
        

        //write out data
        result->suboptStructures.push_back(singlestructure);
        result->suboptEnergyError.push_back(energyError);
        result->suboptFreeEnergy.push_back(correctedEnergy);
    }


    clearDnaStructures(&rna_info.ensemebleStructs);

    return result;
}


FullAdvancedResult* FullEnsembleNoBindingSite(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false) {

    SequenceStructureInfo rna_info = SequenceStructureInfo();
    setSequenceInfo(seqString, &rna_info);   
    setGlobals(NULL, NULL, pseudoknotted, temperature, &rna_info);      
 
    //first get the ensemble through subopt
    if ( rna_info.isPknot == TRUE ) {
        mfeFullWithSym_SubOpt(rna_info.sequenceNumber, rna_info.sequenceLength, &rna_info.ensemebleStructs, 5, RNA, 1 /*DANGLETYPE*/, 
                                rna_info.temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym_SubOpt(rna_info.sequenceNumber, rna_info.sequenceLength, &rna_info.ensemebleStructs, 3, RNA, 1 /*DANGLETYPE*/, 
                                rna_info.temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }


    //now process the results for return to TS
    //initialize the result to return    

    FullAdvancedResult* result = new FullAdvancedResult();
    
    std::string mfeStructure;
    //get dot bracket notation from data 

    for ( int i = 0; i < rna_info.ensemebleStructs.nStructs; i++ ) {
        rna_info.currentStruct = rna_info.ensemebleStructs.validStructs[i];
        
        //get the secondary strucutre in dot paren notation 
        std::string singlestructure = getDotParens(pseudoknotted, rna_info.ensemebleStructs.seqlength, &rna_info.currentStruct);

        if (i == 0)
        {
          //this is the first one so it is the mfe          
          mfeStructure = singlestructure;
        }

        //get energies
        double energyError = rna_info.currentStruct.error;
        double correctedEnergy = rna_info.currentStruct.correctedEnergy;  
        
        //std::string test(rna_info.sequenceNumber);
        std::string test;
        for (int j =0; j < rna_info.sequenceLength; j++) {
               test = test + std::to_string(rna_info.sequenceNumber[j]); 
        }
        //write out data
        result->suboptStructures.push_back(singlestructure);
        result->suboptEnergyError.push_back(energyError);
        result->suboptFreeEnergy.push_back(correctedEnergy);
    }


    clearDnaStructures(&rna_info.ensemebleStructs);


    return result;
}



FullEnsembleDefectResult* GetEnsembleDefect(const std::string& seqString, const std::string& MfeStructure, int temperature, bool pseudoknot) {
  
    FullEnsembleDefectResult* result = new FullEnsembleDefectResult(); 
    
    SequenceStructureInfo rna_info = SequenceStructureInfo();
    setSequenceInfo(seqString, &rna_info);
    setStructureInfo(MfeStructure, &rna_info);
    setGlobals(FALSE,FALSE,pseudoknot,temperature, &rna_info);

    DBL_TYPE nsStar_ED;
        
    // Allocate memory for storing pair probabilities
    pairPr = (DBL_TYPE*) calloc( (rna_info.sequenceLength+1)*(rna_info.sequenceLength+1), sizeof(DBL_TYPE));
    // Allocate memory for storing pair probabilities
    pairPrPbg = (DBL_TYPE*) calloc( (rna_info.sequenceLength+1)*(rna_info.sequenceLength+1), sizeof(DBL_TYPE));
    pairPrPb = (DBL_TYPE*) calloc( (rna_info.sequenceLength+1)*(rna_info.sequenceLength+1), sizeof(DBL_TYPE));


    nsStar_ED = nsStarPairsOrParensFull(rna_info.sequenceLength, rna_info.sequenceNumber, rna_info.thePairs, NULL,
                rna_info.complexity, RNA, 1 /*DANGLETYPE*/,
                rna_info.temperature, SODIUM_CONC,
                MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);

    
    result->ensembleDefect = (long double) nsStar_ED;
    result->ensembleDefectNormalized = (long double) nsStar_ED/rna_info.sequenceLength;

    free(pairPrPbg);
    free(pairPrPb);

    return result;

}

