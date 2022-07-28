#include <vector>
#include "Utils.h"

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
                    std::string substring = dbn.substr(stem[0].first+1,stem[0].second - stem[0].first);
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
                } else if (currentStruct->theStruct[j] == -1) {
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

std::string getDotParensNew(char* RNAseq, const int *thepairs, bool makeForEterna) {
    /*
    This prints the structure of the fold using a '.' for 
    unpaired bases, and ( ), { }, [ ], < > for pairs. 

    The file specified by file name is appended.

    Initially, thefold[i] = '.' for all i

    If this ever becomes the slow step, it can be optimized to run faster
    */
   //count oligos
    char* newSeq;
    do {
        newSeq = strchr(RNAseq, '&');
        if (newSeq) (*newSeq) = '+';
    } while(newSeq);
  
    int seqNum[ MAXSEQLENGTH+1]; 
    int isNicked[ MAXSEQLENGTH];
    int nNicks = 0;

    int nicks[MAXSTRANDS];
    int nickIndex;
    int **etaN;
    int length, tmpLength, seqlength;
    

   
    //the rest is for printing purposes
    tmpLength = length = strlen(RNAseq);
    int i,j, pos;

    for( i = 0; i < tmpLength; i++) {
        isNicked[i] = 0;
        if( RNAseq[i] == '+') {        
        length--;
        isNicked[ i - nNicks++ -1] = 1;
        } 
    }

    

    //initialize nicks
    for( i = 0; i < MAXSTRANDS; i++) {
        nicks[i] = -1;
    }

    nickIndex = 0;
    for( i = 0; i < length; i++) {
        if( isNicked[i])
        nicks[ nickIndex++] = i;
    }

    seqlength = length;
    //overkill, but convenient
    etaN = (int**) malloc( (length*(length+1)/2 + (length+1))*sizeof( int*));
    InitEtaN( etaN, nicks, length);

    int nStrands = etaN[ EtaNIndex( 0.5, seqlength-0.5, seqlength)][0]+1;
    char *thefold = (char*) malloc( (seqlength + nStrands) * sizeof(char));
    
    char pairSymbols[] = { '(', ')', '{','}', '[', ']', '<', '>' };
    int type = 0;
    int nTypes = 4;
   
    int **pairlist; // Each row is i,j pair
    int npairs; // number of pairs in structure
   

    char *parensString;
    parensString = ( char*) malloc( (seqlength+1)*sizeof( char) );
    int lastL, lastR;

    
    // Allocate memory for pairlist (this is more than we need, but be safe)
    pairlist = (int **) malloc(seqlength * sizeof(int *));
    for (i = 0; i < seqlength; i++) {
        pairlist[i] = (int *) malloc(2 * sizeof(int));
    }

    // Create pairlist from thepairs
    npairs = 0;
    for( j = 0; j < seqlength; j++) {
        if(thepairs[j] > j) {
        pairlist[npairs][0] = j;
        pairlist[npairs++][1] = thepairs[j];
        }
    }

    // Creat dot-paren structure
    for( i = 0; i < seqlength+1; i++) {
        parensString[i] = '.';
    }

    //offSet = 0;
    lastL = -1; 
    lastR = seqlength;
    for( i = 0; i < seqlength; i++) {
        if( thepairs[i] != -1 && thepairs[i] > i) {
        if( i > lastR || thepairs[i] > lastR) {
            for( j = 0; j < i; j++) {
            if( thepairs[j] > i && thepairs[j] < thepairs[i]) {
                type = (type + 1) % nTypes;
                break;
            }
            }
        }

        parensString[i] = pairSymbols[ 2*type];
        parensString[ thepairs[i]] = pairSymbols[2*type + 1];
        lastL = i;
        lastR = thepairs[i];
        }
    }

    for( i = 0; i < seqlength+nStrands-1; i++) {
        thefold[i] = '.';
    }

    pos = 0;
    for( i = 0; i < seqlength; i++) {
        thefold[ pos++] = parensString[ i];
        if( etaN[ EtaNIndex_same(i+0.5, seqlength)][0] == 1) {
            if (makeForEterna==true)
            {
                thefold[ pos++] = '&';
            }
            else
            {
                thefold[ pos++] = '+';
            }   
        }
    }

    //now create a string from the characer array to make the string version of the structure
    
    
    std::string dotBracketStructure = "";
    for (int k = 0; k < seqlength; k++ ) {
          
        dotBracketStructure.push_back(thefold[k]);
          
    }  

    return dotBracketStructure;
    
}