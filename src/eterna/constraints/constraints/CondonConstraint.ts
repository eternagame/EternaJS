import {StyledTextBuilder, TextureUtil} from 'flashbang';
import {
    Container, Sprite, Texture
} from 'pixi.js';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import {RNABase} from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext, HighlightInfo} from '../Constraint';

interface CodonConstraintStatus extends BaseConstraintStatus {
    violations: number[];
}

const CODON_MAP = {
    A: [
        [RNABase.GUANINE, RNABase.CYTOSINE, RNABase.CYTOSINE],
        [RNABase.GUANINE, RNABase.CYTOSINE, RNABase.URACIL],
        [RNABase.GUANINE, RNABase.CYTOSINE, RNABase.ADENINE],
        [RNABase.GUANINE, RNABase.CYTOSINE, RNABase.GUANINE]
    ],
    R: [
        [RNABase.ADENINE, RNABase.GUANINE, RNABase.ADENINE],
        [RNABase.ADENINE, RNABase.GUANINE, RNABase.GUANINE],
        [RNABase.CYTOSINE, RNABase.GUANINE, RNABase.GUANINE],
        [RNABase.CYTOSINE, RNABase.GUANINE, RNABase.CYTOSINE],
        [RNABase.CYTOSINE, RNABase.GUANINE, RNABase.ADENINE],
        [RNABase.CYTOSINE, RNABase.GUANINE, RNABase.URACIL]
    ],
    N: [
        [RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE],
        [RNABase.ADENINE, RNABase.ADENINE, RNABase.URACIL]
    ],
    D: [
        [RNABase.GUANINE, RNABase.ADENINE, RNABase.CYTOSINE],
        [RNABase.GUANINE, RNABase.ADENINE, RNABase.URACIL]
    ],
    C: [
        [RNABase.URACIL, RNABase.GUANINE, RNABase.CYTOSINE],
        [RNABase.URACIL, RNABase.GUANINE, RNABase.URACIL]
    ],
    E: [
        [RNABase.GUANINE, RNABase.ADENINE, RNABase.GUANINE],
        [RNABase.GUANINE, RNABase.ADENINE, RNABase.ADENINE]
    ],
    Q: [
        [RNABase.CYTOSINE, RNABase.ADENINE, RNABase.GUANINE],
        [RNABase.CYTOSINE, RNABase.ADENINE, RNABase.ADENINE]
    ],
    G: [
        [RNABase.GUANINE, RNABase.GUANINE, RNABase.CYTOSINE],
        [RNABase.GUANINE, RNABase.GUANINE, RNABase.ADENINE],
        [RNABase.GUANINE, RNABase.GUANINE, RNABase.GUANINE],
        [RNABase.GUANINE, RNABase.GUANINE, RNABase.URACIL]
    ],
    H: [
        [RNABase.CYTOSINE, RNABase.ADENINE, RNABase.CYTOSINE],
        [RNABase.CYTOSINE, RNABase.ADENINE, RNABase.URACIL]
    ],
    I: [
        [RNABase.ADENINE, RNABase.URACIL, RNABase.CYTOSINE],
        [RNABase.ADENINE, RNABase.URACIL, RNABase.URACIL],
        [RNABase.ADENINE, RNABase.URACIL, RNABase.ADENINE]
    ],
    L: [
        [RNABase.CYTOSINE, RNABase.URACIL, RNABase.GUANINE],
        [RNABase.CYTOSINE, RNABase.URACIL, RNABase.CYTOSINE],
        [RNABase.CYTOSINE, RNABase.URACIL, RNABase.URACIL],
        [RNABase.URACIL, RNABase.URACIL, RNABase.GUANINE],
        [RNABase.URACIL, RNABase.URACIL, RNABase.ADENINE],
        [RNABase.CYTOSINE, RNABase.URACIL, RNABase.ADENINE]
    ],
    K: [
        [RNABase.ADENINE, RNABase.ADENINE, RNABase.GUANINE],
        [RNABase.ADENINE, RNABase.ADENINE, RNABase.ADENINE]
    ],
    M: [
        [RNABase.ADENINE, RNABase.URACIL, RNABase.GUANINE]
    ],
    F: [
        [RNABase.URACIL, RNABase.URACIL, RNABase.CYTOSINE],
        [RNABase.URACIL, RNABase.URACIL, RNABase.URACIL]
    ],
    P: [
        [RNABase.CYTOSINE, RNABase.CYTOSINE, RNABase.CYTOSINE],
        [RNABase.CYTOSINE, RNABase.CYTOSINE, RNABase.URACIL],
        [RNABase.CYTOSINE, RNABase.CYTOSINE, RNABase.ADENINE],
        [RNABase.CYTOSINE, RNABase.CYTOSINE, RNABase.GUANINE]
    ],
    S: [
        [RNABase.ADENINE, RNABase.GUANINE, RNABase.CYTOSINE],
        [RNABase.URACIL, RNABase.CYTOSINE, RNABase.CYTOSINE],
        [RNABase.URACIL, RNABase.CYTOSINE, RNABase.URACIL],
        [RNABase.URACIL, RNABase.CYTOSINE, RNABase.ADENINE],
        [RNABase.ADENINE, RNABase.GUANINE, RNABase.URACIL],
        [RNABase.URACIL, RNABase.CYTOSINE, RNABase.GUANINE]
    ],
    T: [
        [RNABase.ADENINE, RNABase.CYTOSINE, RNABase.CYTOSINE],
        [RNABase.ADENINE, RNABase.CYTOSINE, RNABase.ADENINE],
        [RNABase.ADENINE, RNABase.CYTOSINE, RNABase.URACIL],
        [RNABase.ADENINE, RNABase.CYTOSINE, RNABase.GUANINE]
    ],
    W: [
        [RNABase.URACIL, RNABase.GUANINE, RNABase.GUANINE]],
    Y: [
        [RNABase.URACIL, RNABase.ADENINE, RNABase.CYTOSINE],
        [RNABase.URACIL, RNABase.ADENINE, RNABase.URACIL]],
    V: [
        [RNABase.GUANINE, RNABase.URACIL, RNABase.GUANINE],
        [RNABase.GUANINE, RNABase.URACIL, RNABase.CYTOSINE],
        [RNABase.GUANINE, RNABase.URACIL, RNABase.URACIL],
        [RNABase.GUANINE, RNABase.URACIL, RNABase.ADENINE]
    ],
    '*': [
        [RNABase.URACIL, RNABase.GUANINE, RNABase.ADENINE],
        [RNABase.URACIL, RNABase.ADENINE, RNABase.ADENINE],
        [RNABase.URACIL, RNABase.ADENINE, RNABase.GUANINE]
    ]
} as const;

function isValidAA(aa: string): aa is keyof typeof CODON_MAP {
    return aa in CODON_MAP;
}

export default class CodonConstraint extends Constraint<CodonConstraintStatus> {
    public static readonly NAME = 'CODON';
    public readonly aaSequence: string;

    constructor(aaSequence: string) {
        super();
        this.aaSequence = aaSequence;
    }

    public evaluate(context: ConstraintContext): CodonConstraintStatus {
        const sequence = context.undoBlocks[0].sequence;

        const violations: number[] = [];
        this.aaSequence.split('').forEach((aa, idx) => {
            if (!isValidAA(aa)) {
                throw new Error(`Invalid amino acid ${aa} in codon constraint`);
            }
            const validOptions = CODON_MAP[aa];
            const current = [sequence.nt(idx * 3), sequence.nt(idx * 3 + 1), sequence.nt(idx * 3 + 2)] as const;
            if (!validOptions.some((opt) => opt[0] === current[0] && opt[1] === current[1] && opt[2] === current[2])) {
                violations.push(idx);
            }
        });

        return {
            satisfied: violations.length === 0,
            violations
        };
    }

    public getConstraintBoxConfig(status: CodonConstraintStatus): ConstraintBoxConfig {
        const statText = new StyledTextBuilder()
            .append(
                status.violations.length.toString(),
                {fill: (status.satisfied ? 0x00aa00 : 0xFF0000), fontWeight: 'bold'}
            )
            .append('/0');

        const tooltip = ConstraintBox.createTextStyle().append(`Your RNA must code for the protein sequence ${this.aaSequence} with no violations`);

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            icon: CodonConstraint._icon,
            showOutline: true,
            clarificationText: 'CODON VIOLATIONS',
            statText
        };
    }

    public getHighlight(status: CodonConstraintStatus): HighlightInfo {
        return {
            ranges: status.violations.flatMap((idx) => [idx * 3, idx * 3 + 2]),
            color: HighlightType.RESTRICTED
        };
    }

    public serialize(): [string, string] {
        return [
            CodonConstraint.NAME,
            this.aaSequence.toString()
        ];
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1Tex = new BaseTextures(RNABase.ADENINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base1 = new Sprite(base1Tex.texture);
        base1.height = 30;
        base1.scale.x = base1.scale.y;
        base1.position.set(-20, 0);
        icon.addChild(base1);

        const base2Tex = new BaseTextures(RNABase.GUANINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base2 = new Sprite(base2Tex.texture);
        base2.height = 30;
        base2.scale.x = base1.scale.y;
        base2.position.set(0, 0);
        icon.addChild(base2);

        const base4Tex = new BaseTextures(RNABase.CYTOSINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base4 = new Sprite(base4Tex.texture);
        base4.height = 30;
        base4.scale.x = base1.scale.y;
        base4.position.set(20, 0);
        icon.addChild(base4);

        return TextureUtil.renderToTexture(icon);
    }
}
