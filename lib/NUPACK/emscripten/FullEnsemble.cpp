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
    
    // Initialize outparam
    dnaStructures suboptStructs = {
        // validStructs (the structures)
        NULL,
        // nStructs (count of structures)
        0,
        // nAlloc (number of structures allocated)
        0,
        // seqlength
        0,
        // minError (minimum deviation from mfe for all seqs)
        NAD_INFINITY
    };
 
    // Convert Eterna oligo cut points (&) to Nupack oligo cut points (+)
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

    //this chuck of code sets up the variables used to represent adn configure the sequence for the C code to use
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();
    int seqNum[MAXSEQLENGTH+1];
    int seqStringLength = strlen(string);
    
    // Initialize outparam
    dnaStructures suboptStructs = {
        // validStructs (the structures)
        NULL,
        // nStructs (count of structures)
        0,
        // nAlloc (number of structures allocated)
        0,
        // seqlength
        0,
        // minError (minimum deviation from mfe for all seqs)
        NAD_INFINITY
    };
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
    
    //get dot bracket notation from data 
    for ( int i = 0; i < suboptStructs.nStructs; i++ ) {
        oneDnaStruct currentStruct = suboptStructs.validStructs[i];
        
        //get the secondary structure in dot paren notation 
        std::string singlestructure = getDotParens(pseudoknotted, suboptStructs.seqlength, &currentStruct);

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

FullEnsembleDefectResult* GetEnsembleDefect(const std::string& seqString, const std::string& MfeStructure, int temperature, bool pseudoknot) {
  
  FullEnsembleDefectResult* result = new FullEnsembleDefectResult();  
  int complexity;
  DBL_TYPE nsStar_ED;
  int i;
  int nNicks;
  int seqlength;
  int tmpLength;
  int seqNum[MAXSEQLENGTH+1];

  if (pseudoknot) {
      complexity = 5;
  } else {
      complexity = 3;
  }
   

  //convert sequence from string to char*
  auto autoSeqString = MakeCString(seqString);
  char* seqChar = autoSeqString.get();
  

  //convert sequence from latin based characters "A,C,U,G" into numerical representation A=1, C=2, G=3. U=4 
  seqlength = tmpLength = strlen(seqChar);
  convertSeq(seqChar, seqNum, tmpLength);

  // Get the number of strand breaks
  nNicks = 0;
  for (i = 0; i < tmpLength; i++) {
      if (seqChar[i] == '+') {
          nNicks++;
      }
  }
  
  // New sequence length removing the number of breaks or pluses from the total
  seqlength -= nNicks;

  //convert the string structure to a char array
  auto autoMfeStructure = MakeCString(MfeStructure);
  char* MfeStructureChar = autoMfeStructure.get();

  //get the pairs from the struct
  int thepairs[MAXSEQLENGTH+1];
  getStructureFromParens(MfeStructureChar, thepairs, seqlength);  
    
  // Allocate memory for storing pair probabilities
  pairPr = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
  // Allocate memory for storing pair probabilities
  pairPrPbg = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
  pairPrPb = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));


  nsStar_ED = nsStarPairsOrParensFull(seqlength, seqNum, thepairs, NULL,
            complexity, RNA, 1 /*DANGLETYPE*/,
            temperature, SODIUM_CONC,
            MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);

  
  result->ensembleDefect = (long double) nsStar_ED;
  
  free(pairPr);
  free(pairPrPbg);
  free(pairPrPb);

  return result;
}

