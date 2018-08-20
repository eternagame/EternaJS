#include "FullFold.h"
#include "beamckypar.h"

FullFoldResult* FullFoldDefault (std::string seqString) {
    int beamsize = 100;
    bool use_vienna = false;
    bool is_cube_pruning = true;
    bool is_candidate_list = true;
    bool sharpturn = false;

    BeamCKYParser parser(beamsize, use_vienna, is_candidate_list, !sharpturn, is_cube_pruning);
    BeamCKYParser::DecoderResult decoderResult = parser.parse(seqString);

    FullFoldResult* result = new FullFoldResult();
    result->structure = decoderResult.structure;

    return result;
}