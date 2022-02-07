import {Colormaker, ColormakerRegistry} from 'ngl';
import type AtomProxy from 'ngl/dist/declarations/proxy/atom-proxy';
import {Value} from 'signals';
import {RNABase, RNAPaint} from 'eterna/EPars';
import Sequence from 'eterna/rnatypes/Sequence';

enum BaseColor {
    URACIL = 0x3183c0,
    GUANINE = 0xaa1c20,
    ADENINE = 0xffff00,
    CYTOSINE = 0x1b7b3d,
    DEFAULT = 0xFFFFFF
}

export function getBaseColor(base: RNABase | RNAPaint) {
    switch (base) {
        case RNABase.URACIL:
            return BaseColor.URACIL;
        case RNABase.GUANINE:
            return BaseColor.GUANINE;
        case RNABase.ADENINE:
            return BaseColor.ADENINE;
        case RNABase.CYTOSINE:
            return BaseColor.CYTOSINE;
        default:
            return BaseColor.DEFAULT;
    }
}

export default function createColorScheme(sequence: Value<Sequence>) {
    class EternaColorScheme extends Colormaker {
        public atomColor(atom: AtomProxy): number {
            return getBaseColor(sequence.value.nt(atom.residueIndex));
        }
    }

    return ColormakerRegistry._addUserScheme(EternaColorScheme);
}
