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

    //get defect here later for now popuolate with 0
    result->ensembleDefect=0;


    return result;
}


FullAdvancedResult* FullEnsembleNoBindingSite(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false) {

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
          mfeStructure =  singlestructure;
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

    //get defect here later for now popuolate with 0
    //get defect here later for now popuolate with 0
    auto autoStructString = MakeCString(mfeStructure);
    char* newSecondStruct = autoStructString.get();

    //get ensemble defect for mfe structure
     Defect ensembleDefectStruct;
     double ensembleDefect = -2;
     double ensembleDefectNormalized = -3;
     double mfeDefect = -4;
     double mfeDefectNormalized = -5;
     bool getDefectMFE = false;
    ensembleDefectStruct = getEnsembleDefect(string, newSecondStruct, temperature, pseudoknotted, false, getDefectMFE);
    ensembleDefect = ensembleDefectStruct.ensembleDefect;
    ensembleDefectNormalized = ensembleDefectStruct.ensembleDefectNormalized;
    
    getDefectMFE=true;
    ensembleDefectStruct = getEnsembleDefect(string, newSecondStruct, temperature, pseudoknotted, false, getDefectMFE);
    mfeDefect = ensembleDefectStruct.mfeDefect;
    mfeDefectNormalized = ensembleDefectStruct.mfeDefectNormalized;

    result->ensembleDefect=ensembleDefect;
    result->ensembleDefectNormalized=ensembleDefectNormalized;
    result->mfeDefect=mfeDefect;
    result->mfeDefectNormalized=mfeDefectNormalized;


    return result;
}

// This code was pulled directly from src/thermo/basics/defect.c with minimal changes
Defect getEnsembleDefect(char* seqChar, char* dotParensStructure, int temperature, bool pseudoknot, bool multiFold, bool mfeDefect) {
  //set global constants needed for correct folding and ensemble reporting     
    
  DANGLETYPE=1;  

  if (multiFold==true) {
    Multistranded = 1;
  } else {
    Multistranded = 0;
  }

  if (pseudoknot == true) {
    DO_PSEUDOKNOTS = 1;
  } else {
    DO_PSEUDOKNOTS = 0;
  }

  if (mfeDefect==true) {
    USE_MFE = 1;
    // -degenerate flag not used for defect calcs, force ONLY_ONE_MFE
    ONLY_ONE_MFE = 1;
  } else {
    USE_MFE = 0;
    ONLY_ONE_MFE = 0;
  }

  int i, j;
  int trySymetry=TRUE;
  
  
  DBL_TYPE nsStar;
  DBL_TYPE mfe; // Minimum free energy (not really used)
  DBL_TYPE ene; // Free energy (used to check if the structure is legal)
  int vs;
  int complexity;
  int tmpLength;
  int seqlength;
  int nbases; // Number of bases as read from ppairs or mfe file
 
  int nNicks;  // Number of strands
  int doCalc; // Whether we need to compute the pair probability matrix/mfe or not
  
   int seqStringLength;
  char *tok; // Token
  char tokseps[] = " \t\n"; // Token separators

  //convert structure and sequence to char

  
  int seqNum[MAXSEQLENGTH+1];
  seqlength = seqStringLength = tmpLength = strlen(seqChar);
  

  convertSeq(seqChar, seqNum, seqStringLength);

  
  // Get the number of strand breaks
  nNicks = 0;
  for (i = 0; i < tmpLength; i++) {
    if (seqChar[i] == '+') {
      nNicks++;
      seqlength--;
    }
  }

  int thepairs[MAXSEQLENGTH+1];
  getStructureFromParens( dotParensStructure, thepairs, seqlength);
  
  ene = naEnergyPairsOrParensFullWithSym( thepairs, NULL, seqNum, RNA, 1 /*DANGLETYPE*/,
          temperature, trySymetry,
          SODIUM_CONC, MAGNESIUM_CONC,
          USE_LONG_HELIX_FOR_SALT_CORRECTION);

  // Allocate memory for storing pair probabilities
  pairPr = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
  
  //stuff for folding and getting probs
  dnaStructures mfeStructs = {NULL, 0, 0, 0, NAD_INFINITY};
  
  //printInputs( argc, argv, seqChar, vs, NULL, parens, "screen");

  if (USE_MFE) {
    if ( !DO_PSEUDOKNOTS ) {
      complexity = 3;
    } else {
      complexity = 5;
    }

    // Compute MFE and MFE structure
    mfe = mfeFullWithSym( seqNum, tmpLength, &mfeStructs, complexity, RNA, DANGLETYPE, temperature, trySymetry,
        ONLY_ONE_MFE, SODIUM_CONC, MAGNESIUM_CONC,
        USE_LONG_HELIX_FOR_SALT_CORRECTION);

    // Compute nsStar from output
    nsStar = 0.0;
    for (i = 0; i < seqlength; i++) {
      if (thepairs[i] != (mfeStructs.validStructs)[0].theStruct[i]) {
        nsStar += 1.0;
      }
    }
  } else {
    // Allocate memory for storing pair probabilities
    pairPrPbg = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
    pairPrPb = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));

    if ( !DO_PSEUDOKNOTS ) {
      complexity = 3;
    } else {
      complexity = 5;
    }

    nsStar = nsStarPairsOrParensFull(seqlength, seqNum, thepairs, NULL,
              complexity, RNA, 1 /*DANGLETYPE*/,
              temperature, SODIUM_CONC,
              MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);


    free(pairPrPbg);
    free(pairPrPb);
  }


  double EnsembleDefect;
  double EnsembleDefectNormalized;
  
  Defect defectResult = Defect();
  
  if (USE_MFE) {
    //Fraction of correct nucleotides vs. MFE

    defectResult.mfeDefect=(long double) nsStar;
    defectResult.mfeDefectNormalized=(long double) nsStar/seqlength;
    defectResult.ensembleDefect = NULL;
    defectResult.ensembleDefectNormalized = NULL;
  } else {
    //Ensemble defect n(s,phi) and normalized ensemble defect n(s,phi)/N;

    defectResult.mfeDefect=NULL;
    defectResult.mfeDefectNormalized=NULL;
    defectResult.ensembleDefect = (long double) nsStar;
    defectResult.ensembleDefectNormalized = (long double) nsStar/seqlength;
   
  }
  

  return defectResult;
}

