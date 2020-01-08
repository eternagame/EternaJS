#include "FullFold.h"
#include "LinearFold.h"

FullFoldResult* FullFoldDefault (std::string seqString) {
    int beamsize = 100;
    bool sharpturn = false;

    BeamCKYParser parser(beamsize, !sharpturn);
    BeamCKYParser::DecoderResult decoderResult = parser.parse(seqString);

    FullFoldResult* result = new FullFoldResult();
    result->structure = decoderResult.structure;

    return result;
}
