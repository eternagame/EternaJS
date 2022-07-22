#include "FullEnsemble.h"
#include "EmscriptenUtils.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"
#include <vector>
#include <utility>
#include <string> 


FullAdvancedResult* FullEnsembleWithOligos(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false)
{

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
            if( currentStruct.theStruct[j] > j ) {
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


FullAdvancedResult* FullEnsembleNoBindingSite(const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted = false)
{

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
    
    
    //get dot bracket notation from data 
    for ( int i = 0; i < suboptStructs.nStructs; i++ ) {
        oneDnaStruct currentStruct = suboptStructs.validStructs[i];

        //get the secondary strucutre in dot paren notation 
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

    //get defect here later for now popuolate with 0
    result->ensembleDefect=0;


    return result;
}

//this is the current implementation of generating the dot paren structure from the fold as of 7/20/22
//this seams to be lacking compaired to nupacks PrintDNAStructure called by the basics apps
//when displaying the structure
std::string getDotParens(bool pseudoknotted, const int seqlength, oneDnaStruct *currentStruct) {

    bool debuging =false;
    std::string bpsAfterBuild="";
    std::string pairs = "";
    std::string otherpairs = "";
    std::string singlestructure = ""; 
    std::string stemString = "";
    std::string stemStringplus1 = "";
    std::string substringy = "";
    if ( pseudoknotted ) {
            // given partner-style array, writes dot-parens notation string. handles pseudoknots!
            // example of partner-style array: '((.))' -> [4,3,-1,1,0]


            //steps through the sequnce and if nucs pair is not -1 and thus is paired && and nuc is paired with a nuc that is greater than its own num
            //if true 
            std::vector< std::pair< int, int > > bps;
            for (int ii = 0; ii < seqlength; ++ii) {
                if (currentStruct->theStruct[ii] != -1 && currentStruct->theStruct[ii] > ii) {
                    bps.push_back( std::make_pair( ii, currentStruct->theStruct[ii]) );   
                    otherpairs = otherpairs + std::to_string(ii)+":"+std::to_string(currentStruct->theStruct[ii])+", ";                        
                }
            }
            
            for (int index =0; index<seqlength; index++)
            {
                pairs = pairs + std::to_string(index)+":"+std::to_string(currentStruct->theStruct[index])+", ";                
            }

            for (int index =0; index<bps.size(); index++)
            {               
                bpsAfterBuild = bpsAfterBuild + std::to_string(bps[index].first)+":"+std::to_string(bps[index].second)+", ";
            }
            

            std::vector< std::vector< std::pair< int, int > > > stems;
            // #bps: list of bp lists
            // # i.e. '((.))' is [[0,4],[1,3]]
            // # Returns list of (list of bp lists), now sorted into stems
            // # i.e. [ list of all bps in stem 1, list of all bps in stem 2]
            //if debug: print(bps)
            for (int ii = 0; ii < bps.size(); ++ii ) {
                bool added = false;
                for (int jj = 0; jj < stems.size(); ++jj) {
                    // is this bp adjacent to any element of an existing stem?
                    for (int kk = 0; kk < stems[jj].size(); ++kk) {
                        if ((bps[ii].first - 1 == stems[jj][kk].first && bps[ii].second + 1 == stems[jj][kk].second) ||
                                (bps[ii].first + 1 == stems[jj][kk].first && bps[ii].second - 1 == stems[jj][kk].second) ||
                                (bps[ii].first - 1 == stems[jj][kk].second && bps[ii].second + 1 == stems[jj][kk].first) ||
                                (bps[ii].first + 1 == stems[jj][kk].second && bps[ii].second - 1 == stems[jj][kk].first)) {
                            // add to this stem
                            stems[jj].push_back(bps[ii]);
                            added = true;
                            break;
                        }
                    }
                    if (added) break;
                }
                if (!added) {
                    stems.push_back(std::vector< std::pair< int, int > >( 1, bps[ii] ) );
                }
            }

           
            //std::string singlestructure = ""; 

            for (int index =0; index<stems.size(); index++)
            {               
                stemString = stemString + std::to_string(stems[index][0].first)+":"+std::to_string(stems[index][0].second)+", ";
                stemStringplus1 = stemStringplus1 + std::to_string(stems[index][0].first+1)+":"+std::to_string(stems[index][0].second)+", ";
            }

            std::string dbn( seqlength, '.' );
            std::vector< char > chars_L{ '(', '{', '[', '<' };
            std::vector< char > chars_R{ ')', '}', ']', '>' };
            if ( !stems.empty() ) {
                for (int ii = 0; ii < stems.size(); ++ii ) {
                    auto const & stem = stems[ii];
                    
                    size_t pk_ctr = 0;
                    std::string substring = dbn.substr(stem[0].first+1,stem[0].second);
                    substringy = substringy + substring + ", ";
                    //check to see how many delimiter types exist in between where stem is going to go
                    // ah -- it's actually how many delimiters are only half-present, I think.
                    while ( ( substring.find(chars_L[pk_ctr]) != std::string::npos && substring.find(chars_R[pk_ctr]) == std::string::npos )
                            || ( substring.find(chars_L[pk_ctr]) == std::string::npos && substring.find(chars_R[pk_ctr]) != std::string::npos ) ) {
                        pk_ctr += 1;
                    }
                    for (int jj = 0; jj < stem.size(); ++jj ) {
                        int i = stem[jj].first;
                        int j = stem[jj].second;
                        
                        dbn[i] = chars_L[pk_ctr];
                        dbn[j] = chars_R[pk_ctr];

                        substringy = substringy +  " pair =" + dbn[i] + ": "+ dbn[j]+" , ";
                    }
                }
            }
            for (int j = 0; j < seqlength; j++) {
                singlestructure.push_back(dbn[j]);
            }
        } else {
            for (int j = 0; j < seqlength; j++) {
                if (currentStruct->theStruct[j] > j) {
                    singlestructure.push_back('(');
                } else if(currentStruct->theStruct[j] == -1) {
                    singlestructure.push_back('.');
                } else {
                    singlestructure.push_back(')');
                }
            }
        }

    if (debuging==true)
    {
        std::string debugString = "pairs = "+ pairs + ">>>>>> bps after build = "+bpsAfterBuild + " >>>>>>>> otehr pairs = " + otherpairs + " >>>>>> stems = " + stemString + " >>>>>>> stemstring +1 = " +stemStringplus1 + " >>>>> substrings = " + substringy + " >>>>>>> structure = "+singlestructure;
       return debugString;
    }
    else
    {
       return singlestructure;
    }
    

    

}


