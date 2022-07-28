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

bool forEternaDigest = true;
bool notforEternaDigest= false;

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
        //old method
        //std::string singlestructure = getDotParens(pseudoknotted, suboptStructs.seqlength, &currentStruct);
        
        std::string singlestructure = getDotParens(pseudoknotted, suboptStructs.seqlength, &currentStruct);
        if (i == 0)
        {
          //this is the first one so it is the mfe          
          mfeStructure =singlestructure;
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

/*
  mode is how to do the ED
  1= do only ED
  2 = do only MFE ED
  3 = do both
*/

FullDefectResult* FullEnsembleDefect( const std::string& seqString, const std::string& MfeStructure, int temperature, bool const pseudoknotted = false, int const mode = 1) {

  auto autoSeqString = MakeCString(seqString);
  char* string = autoSeqString.get();

  auto autoMfeStructure = MakeCString(MfeStructure);
  char* MfeStructureString = autoMfeStructure.get();

  

  //bool array for 
  bool testList[2] = {false};
  if(mode == 1)
  {
    testList[0]=true;
    testList[1]=false;
  }
  else if (mode == 2 )
  {
    testList[0]=false;
    testList[1]=true;
  }
 
  
  FullDefectResult*  result = new FullDefectResult();

  Defect ensembleDefectStruct;
  bool getDefectMFE = false;
  bool getDefectEnesmble = false;

  if(mode>=3)
  {
  getDefectMFE = true;
  getDefectEnesmble=true;
  ensembleDefectStruct = GetEnsembleDefect(string, MfeStructureString, temperature, pseudoknotted, false,getDefectEnesmble, getDefectMFE);
  }
  else
  {
    if(testList[0]==true)
    {
      getDefectMFE = false;
      getDefectEnesmble=true;
      ensembleDefectStruct = GetEnsembleDefect(string, MfeStructureString, temperature, pseudoknotted, false,getDefectEnesmble, getDefectMFE);
    } 
    
    if(testList[1]==true)
    {  
      getDefectMFE=true;
      getDefectEnesmble=false;
      ensembleDefectStruct = GetEnsembleDefect(string, MfeStructureString, temperature, pseudoknotted, false,getDefectEnesmble, getDefectMFE);
    }       
  }
  
 
  result->ensembleDefect=ensembleDefectStruct.ensembleDefect;
  result->ensembleDefectNormalized=ensembleDefectStruct.ensembleDefectNormalized;
  result->mfeDefect=ensembleDefectStruct.mfeDefect;
  result->mfeDefectNormalized=ensembleDefectStruct.mfeDefectNormalized;

  return result;

}

// This code was pulled directly from src/thermo/basics/defect.c with minimal changes
Defect GetEnsembleDefect(char* seqChar, char* dotParensStructure, int temperature, bool pseudoknot, bool multiFold, bool doEDefect, bool doMfeDefect) {
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

  struct {
    int USE_MFE_doMFE;
    int ONLY_ONE_MFE_doMFE;
    int USE_MFE_doED;
    int ONLY_ONE_MFE_doED;
    bool doMFE;
    bool doED;
  } EDTypes;

    
  EDTypes.USE_MFE_doMFE=1;
  // -degenerate flag not used for defect calcs, force ONLY_ONE_MFE  
  EDTypes.ONLY_ONE_MFE_doMFE=1;  
  EDTypes.USE_MFE_doED=0;   
  EDTypes.ONLY_ONE_MFE_doED=0;
  EDTypes.doED=doEDefect;
  EDTypes.doMFE=doMfeDefect;

 

  int i, j;
  int trySymetry=TRUE;
  
  
  DBL_TYPE nsStar_ED;
  DBL_TYPE nsStar_MFE;
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
  

  
  //printInputs( argc, argv, seqChar, vs, NULL, parens, "screen");

  //First do ED and if forced 

  if (EDTypes.doED==TRUE)
  {
    USE_MFE=EDTypes.USE_MFE_doED;
    ONLY_ONE_MFE=EDTypes.ONLY_ONE_MFE_doED;
  
  ene = naEnergyPairsOrParensFullWithSym( thepairs, NULL, seqNum, RNA, 1 /*DANGLETYPE*/,
          temperature, trySymetry,
          SODIUM_CONC, MAGNESIUM_CONC,
          USE_LONG_HELIX_FOR_SALT_CORRECTION);

  // Allocate memory for storing pair probabilities
  pairPr = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
  
  //stuff for folding and getting probs
  dnaStructures mfeStructs = {NULL, 0, 0, 0, NAD_INFINITY};

    // Allocate memory for storing pair probabilities
    pairPrPbg = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
    pairPrPb = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));

    if ( !DO_PSEUDOKNOTS ) {
      complexity = 3;
    } else {
      complexity = 5;
    }

    nsStar_ED = nsStarPairsOrParensFull(seqlength, seqNum, thepairs, NULL,
              complexity, RNA, 1 /*DANGLETYPE*/,
              temperature, SODIUM_CONC,
              MAGNESIUM_CONC, USE_LONG_HELIX_FOR_SALT_CORRECTION);


    free(pairPrPbg);
    free(pairPrPb);
  }

  if (EDTypes.doMFE==TRUE)
  {

    USE_MFE=EDTypes.USE_MFE_doED;
    ONLY_ONE_MFE=EDTypes.ONLY_ONE_MFE_doED;

    if ( !DO_PSEUDOKNOTS ) {
      complexity = 3;
    } else {
      complexity = 5;
    }
    
  
    ene = naEnergyPairsOrParensFullWithSym( thepairs, NULL, seqNum, RNA, 1 /*DANGLETYPE*/,
            temperature, trySymetry,
            SODIUM_CONC, MAGNESIUM_CONC,
            USE_LONG_HELIX_FOR_SALT_CORRECTION);

    // Allocate memory for storing pair probabilities
    pairPr = (DBL_TYPE*) calloc( (seqlength+1)*(seqlength+1), sizeof(DBL_TYPE));
    
    //stuff for folding and getting probs
    dnaStructures mfeStructs = {NULL, 0, 0, 0, NAD_INFINITY};

    // Compute MFE and MFE structure
    mfe = mfeFullWithSym( seqNum, tmpLength, &mfeStructs, complexity, RNA, DANGLETYPE, temperature, trySymetry,
        ONLY_ONE_MFE, SODIUM_CONC, MAGNESIUM_CONC,
        USE_LONG_HELIX_FOR_SALT_CORRECTION);

    // Compute nsStar from output
    nsStar_MFE = 0.0;
    for (i = 0; i < seqlength; i++) {
      if (thepairs[i] != (mfeStructs.validStructs)[0].theStruct[i]) {
        nsStar_MFE += 1.0;
      }
    }
  }  

  double EnsembleDefect;
  double EnsembleDefectNormalized;
  
  Defect defectResult = Defect();

  defectResult.ensembleDefect = -1;
  defectResult.ensembleDefectNormalized = -1;
  defectResult.mfeDefect=-1;
  defectResult.mfeDefectNormalized=-1;
  
  if (doMfeDefect == TRUE) {
    //Fraction of correct nucleotides vs. MFE

    defectResult.mfeDefect=(long double) nsStar_MFE;
    defectResult.mfeDefectNormalized=(long double) nsStar_MFE/seqlength;
    
  }
  
  if (doEDefect == TRUE) {
    //Ensemble defect n(s,phi) and normalized ensemble defect n(s,phi)/N;

    defectResult.ensembleDefect = (long double) nsStar_ED;
    defectResult.ensembleDefectNormalized = (long double) nsStar_ED/seqlength;
   
  }  

  return defectResult;
}

