#include "FullFold.h"
#include "LinearFold.h"
#include "LinearPartition.h"

#include <algorithm>
#include <string>
#include <sstream>


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
