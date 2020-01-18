#include "FullFold.h"
#include "LinearFold.h"

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
