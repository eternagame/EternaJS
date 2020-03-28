#include "FullFold.h"
#include "LinearFold.h"
#include "LinearPartition.h"

#include <cmath>
#include <cstring>
#include <algorithm>
#include <string>
#include <sstream>

/**
 *  This is a Vienna datastructure we are borrowing to use for dotplot construction here
 */
typedef struct plist {
  int i;
  int j;
  float p;
  int type;
} plist;


FullFoldResult* FullFoldDefault (std::string seqString) {
    int beamsize = 100;
    bool sharpturn = false;

    BeamCKYParser parser(beamsize, !sharpturn);

	// The default parser will have use_constraints == false so we
	// can safely pass null here.
	BeamCKYParser::DecoderResult decoderResult = parser.parse(seqString, nullptr);

    FullFoldResult* result = new FullFoldResult();
    result->structure = decoderResult.structure;

    return result;
}


// struct plist *make_plist(int length, double pmin) {
//     /* convert matrix of pair probs to plist */
//     struct plist *pl;
//     int i, j, k = 0, maxl;
//     maxl = 2 * length;
//     pl = (struct plist *) space(maxl * sizeof(struct plist));
//     k = 0;
//     for (i = 1; i < length; i++)
//         for (j = i + 1; j <= length; j++) {
//             if (pr[iindx[i] - j] < pmin) continue;
//             if (k >= maxl - 1) {
//                 maxl *= 2;
//                 pl = (struct plist *) xrealloc(pl, maxl * sizeof(struct plist));
//             }
//             pl[k].i = i;
//             pl[k].j = j;
//             pl[k++].p = pr[iindx[i] - j];
//         }
//     pl[k].i = 0;
//     pl[k].j = 0;
//     pl[k++].p = 0;
//     return pl;
// }

// struct plist *b2plist(const char *struc) {
//     /* convert bracket string to plist */
//     short *pt;
//     struct plist *pl;
//     int i, k = 0;
//     pt = make_pair_table(struc);
//     pl = (struct plist *) space(strlen(struc) / 2 * sizeof(struct plist));
//     for (i = 1; i < strlen(struc); i++) {
//         if (pt[i] > i) {
//             pl[k].i = i;
//             pl[k].j = pt[i];
//             pl[k++].p = 0.95 * 0.95;
//         }
//     }
//     free(pt);
//     pl[k].i = 0;
//     pl[k].j = 0;
//     pl[k++].p = 0;
//     return pl;
// }

// static char* InitConstraints (const char* string, const char* structure) {
//     char* constraints = (char *) space(sizeof(char)*(strlen(string) + 1));

//     // convention for the structure variable:
//     // - empty => no constraints, normal fold
//     // - same length as sequence => the Vienna-style constraint .|<>()
//     // - twice the length of the sequence => estimate mode, pairs of (U|P) combined with [-9,+9]
//     //
//     if(strlen(structure) == 0) {
//         fold_constrained = 0;
//         estimate_mode = 0;

//     } else {
//         if(strlen(structure) != strlen(string) * 2) {
//             estimate_mode = 0;
//             if(strlen(structure) != strlen(string)) {
//                 fprintf(stderr,"ViennaRNA : Wrong constraint length %d %d", strlen(structure), strlen(string));
//                 fold_constrained = 0;
//             } else {
//                 strcpy(constraints, structure);
//                 fold_constrained = 1;
//             }
//         } else {
//             int ii;
//             fold_constrained = 1;
//             estimate_mode = 1;

//             for(ii=0; ii<strlen(string); ii++) {

//                 char multiplier = 1;
//                 int num = structure[2*ii+1] - '0';
//                 char level = 0;

//                 if(num < 0 || num > 9) {
//                     fold_constrained = 0;
//                     fprintf(stderr,"ViennaRNA : Wrong constraint weight");
//                     break;
//                 }

//                 level = (char)(num);

//                 if(structure[2*ii] == 'P') {
//                     multiplier = -1;
//                 } else if(structure[2*ii] == 'U') {
//                     multiplier = 1;
//                 } else {
//                     fprintf(stderr,"ViennaRNA : unrecognized constraint");
//                     fold_constrained = 0;
//                     break;
//                 }

//                 constraints[ii] = level * multiplier;
//             }
//         }
//     }

//     return constraints;
// }

std::unordered_map<std::pair<int,int>, float, LinearPartition::hash_pair>
get_bpp( std::string & seq, double & energy ) {
    int beamsize = 100;
    bool sharpturn = false;
    bool is_verbose = false;
    bool pf_only = false;
    float bpp_cutoff = 0.0;

    // variables for decoding
    int num=0, total_len = 0;
    unsigned long long total_states = 0;
    double total_score = .0;
    double total_time = .0;

    int seq_index = 0;
    std::string bpp_file_index = "";

    // lhuang: moved inside loop, fixing an obscure but crucial bug in initialization
    LinearPartition::BeamCKYParser parser(beamsize, !sharpturn, is_verbose, "", "", pf_only, bpp_cutoff);

    // BeamCKYParser::DecoderResult result = parser.parse(seq);
    parser.parse(seq);
    energy = parser.partition();
    return parser.get_Pij();
}

DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString) {

    // double temperature = temperature_in;
    auto seqString2 = seqString;
    double energy;
    auto pij = get_bpp(seqString2, energy);

    DotPlotResult* result = new DotPlotResult();
    for ( int ii = 0; ii < seqString.size(); ++ii ) {
        for ( int jj = ii + 1; jj < seqString.size(); ++jj ) {
            auto prob = pij[std::make_pair( ii + 1, jj + 1 )];
            if ( prob < 1e-5) continue;
            result->plot.push_back( ii + 1 );
            result->plot.push_back( jj + 1 );
            result->plot.push_back( prob  );
        }
    }
    result->energy = energy;

    return result;
}
