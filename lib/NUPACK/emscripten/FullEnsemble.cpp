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
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();
    int seqNum[MAXSEQLENGTH+1];
    


    //runtime_constants.h defines NAD_INFINITY
    //#define NAD_INFINITY 100000 //artificial value for positive infinity
    //this is how teh dnastructure call looks for subopt.c which is waht iran when you ron normal nupack compiled code
    //here are comments from pfuncutilheaders.h on hwat the attributes of dnastructures consist of
    
    //oneDnaStruct and dnaStructures are used for enumerating sequences
       // typedef struct {
       // int *theStruct; //describes what is paired to what
       // DBL_TYPE error; //accumulated error (from the mfe) for a structure
       // DBL_TYPE correctedEnergy; //actual energy of a structure
       // int slength;
       // //(accounting for symmetry).
       //  } oneDnaStruct;
       //
       // typedef struct {
       // oneDnaStruct *validStructs;
       //int nStructs; //# of structures stored
       //int nAlloc; //# of structures allocated
       // int seqlength;
       // DBL_TYPE minError; //minimum deviation from mfe for all seqs
       //in validStructs
       //
       //} dnaStructures;
    
    //this struct will store
    //all the structures within the given range
    dnaStructures suboptStructs = {NULL, 0, 0, 0, NAD_INFINITY}; 
 
    //convert from how it comes from eterna to how nuapck needs it for joined oligos '+'
    char* pc;
    do {
        pc = strchr(string, '&');
        if (pc) (*pc) = '+';
    } while(pc);
  

    int seqStringLength = strlen(string);    
    convertSeq(string, seqNum, seqStringLength);
  

    //first get the ensemble through subopt
    if ( pseudoknotted ) {
        mfeFullWithSym_SubOpt(seqNum, seqStringLength, &suboptStructs, 5, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym_SubOpt(seqNum, seqStringLength, &suboptStructs, 3, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }

    //initialize the result to return
    FullAdvancedResult* result = new FullAdvancedResult();
    
    int i, j;
    //get dot bracket notation from data 
    for (i = 0; i < suboptStructs.nStructs; i++ ) {
        oneDnaStruct currentStruct = suboptStructs.validStructs[i];

        //each structure reset this
        std::string singlestructure = "";             
        for (j = 0; j < suboptStructs.seqlength; j++ ) {
            if ( currentStruct.theStruct[j] > j ) {
                singlestructure.push_back('(');
            }
            else if ( currentStruct.theStruct[j] == -1 ) {
                singlestructure.push_back('.');
            }
            else singlestructure.push_back(')');
        }  

        
        std::string constraints = singlestructure;
        for (pc = string, i = 0, j = 0; (*pc); pc++, j++) {
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

    clearDnaStructures(&suboptStructs);
    return result;
}


FullAdvancedResult* FullEnsembleNoBindingSite(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false) {


    SequenceStructureInfo rna_info = SequenceStructureInfo();
    std::string testStruct = ".....((((((.....))))))..............(((((..(((....)))..)))))................(((((((....))))))).....................";
    getSequenceInfo(seqString, &rna_info);
    getStructureInfo(testStruct, &rna_info);
    SetGlobals(FALSE,FALSE,pseudoknotted,temperature, &rna_info);


    //this chuck of code sets up the variables used to represent adn configure the sequence for the C code to use
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();
    int seqNum[MAXSEQLENGTH+1];
    int seqStringLength = strlen(string);
    //runtime_constants.h defines NAD_INFINITY
    //#define NAD_INFINITY 100000 //artificial value for positive infinity
    //this is how teh dnastructure call looks for subopt.c which is waht iran when you ron normal nupack compiled code
    //here are comments from pfuncutilheaders.h on hwat the attributes of dnastructures consist of
    
    //oneDnaStruct and dnaStructures are used for enumerating sequences
       // typedef struct {
       // int *theStruct; //describes what is paired to what
       // DBL_TYPE error; //accumulated error (from the mfe) for a structure
       // DBL_TYPE correctedEnergy; //actual energy of a structure
       // int slength;
       // //(accounting for symmetry).
       //  } oneDnaStruct;
       //
       // typedef struct {
       // oneDnaStruct *validStructs;
       //int nStructs; //# of structures stored
       //int nAlloc; //# of structures allocated
       // int seqlength;
       // DBL_TYPE minError; //minimum deviation from mfe for all seqs
       //in validStructs
       //
       //} dnaStructures;
    
    //this struct will store
    //all the structures within the given range
    dnaStructures suboptStructs = {NULL, 0, 0, 0, NAD_INFINITY};     
    convertSeq(string, seqNum, seqStringLength);



    //first get the ensemble through subopt
    if ( pseudoknotted ) {
        mfeFullWithSym_SubOpt(seqNum, seqStringLength, &suboptStructs, 5, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym_SubOpt(seqNum, seqStringLength, &suboptStructs, 3, RNA, 1 /*DANGLETYPE*/, 
                                temperature, TRUE, (DBL_TYPE) kcalDeltaRange, 
                                0, SODIUM_CONC, MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }

    //initialize the result to return
    
    FullAdvancedResult* result = new FullAdvancedResult();
    
    std::string mfeStructure;
    //get dot bracket notation from data 
    for ( int i = 0; i < suboptStructs.nStructs; i++ ) {
        oneDnaStruct currentStruct = suboptStructs.validStructs[i];
        
        //get the secondary strucutre in dot paren notation 
        std::string singlestructure = getDotParens(pseudoknotted, suboptStructs.seqlength, &currentStruct);
        if (i == 0)
        {
          //this is the first one so it is the mfe          
          mfeStructure = singlestructure;
        }

        //get energies
        double energyError = currentStruct.error;
        double correctedEnergy = currentStruct.correctedEnergy;  
        
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

    clearDnaStructures(&suboptStructs);

    return result;
}

/*
  mode is how to do the ED
  1= do only ED
  2 = do only MFE ED
  3 = do both
*/

FullEnsembleDefectResult* GetEnsembleDefect(const std::string& seqString, const std::string& MfeStructure, int temperature, bool pseudoknot) {
  
    FullEnsembleDefectResult* result = new FullEnsembleDefectResult(); 
    
    SequenceStructureInfo rna_info = SequenceStructureInfo();
    getSequenceInfo(seqString, &rna_info);
    getStructureInfo(MfeStructure, &rna_info);
    SetGlobals(FALSE,FALSE,pseudoknot,temperature, &rna_info);

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

