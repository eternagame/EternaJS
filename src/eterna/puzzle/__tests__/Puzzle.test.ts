import Eterna from "eterna/Eterna";
import Sequence from "eterna/rnatypes/Sequence";
import { TargetConditions } from "eterna/UndoBlock";
import Puzzle, { PuzzleType } from "../Puzzle";

beforeAll(() => {
    // @ts-ignore
    Eterna.settings = {lastUsedFolder: {value: ''}}
});

describe('Puzzle#barcodeIndices', () => {
    it('should return the 7 bases from the barcode start if the barcode start position is present', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.useBarcode = true;
        puz.barcodeStart = 10;
        puz.secstructs = ['.'.repeat(50)];
        expect(puz.barcodeIndices).toEqual([10, 11, 12, 13, 14, 15, 16]);
    });

    it('should return the 7 bases prior to the tail if tails are enabled', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.useBarcode = true;
        puz.secstructs = ['.'.repeat(50)];
        // There will be 5 extra bases added to the front and 20 added to the end,
        // so our puzzle will actually be 75 bases long instead of 50
        puz.setUseTails(true, false);
        expect(puz.barcodeIndices).toEqual([47, 48, 49, 50, 51, 52, 53]);
    });

    it('should return the last 7 bases if neither barcode start or tails are specified', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.useBarcode = true;
        puz.secstructs = ['.'.repeat(50)];
        expect(puz.barcodeIndices).toEqual([43, 44, 45, 46, 47, 48, 49]);
    });

    it('should prefer the barcode start field over the use tails value', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.useBarcode = true;
        puz.barcodeStart = 10;
        puz.secstructs = ['.'.repeat(50)];
        puz.setUseTails(true, false);
        expect(puz.barcodeIndices).toEqual([10, 11, 12, 13, 14, 15, 16]);
    });
});

describe('Puzzle#getBarcodeHairpin', () => {
    it('should return the bases of the sequence corresponding to the barcode indices', () => {
        const seq = Sequence.fromSequenceString('AAAAGGGGCCCCUUUU');
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.useBarcode = true;
        puz.secstructs = ['.'.repeat(16)];
        expect(puz.getBarcodeHairpin(seq).sequenceString()).toBe('CCCUUUU');
    });
});

describe('set Puzzle#objective', () => {
    it('should not modify provided oligo labels', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        const tcs: TargetConditions[] = [
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test'},
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test'},
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAU', oligo_label: 'test'},
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test1'},
            {type: 'multistrand', secstruct: '.', oligos: [
                {sequence: 'UUUU', malus: 0, name: '', label: '1test'},
                {sequence: 'UUUU', malus: 0, name: '', label: '1test'},
                {sequence: 'UUUA', malus: 0, name: '', label: '1test'},
                {sequence: 'UUUU', malus: 0, name: '', label: '1test1'},
            ]},
            {type: 'multistrand', secstruct: '.', oligos: [
                {sequence: 'AAAA', malus: 0, name: '', label: 'test'},
                {sequence: 'AAAU', malus: 0, name: '', label: 'test'},
                {sequence: 'AAAA', malus: 0, name: '', label: 'test1'},
                {sequence: 'UUUU', malus: 0, name: '', label: '1test'},
                {sequence: 'UUUA', malus: 0, name: '', label: '1test'},
                {sequence: 'UUUU', malus: 0, name: '', label: '1test1'},
            ]}
        ];
        puz.objective = JSON.parse(JSON.stringify(tcs));
        for (let i=0; i < tcs.length; i++) {
            if (tcs[i].type === 'oligo') {
                expect(puz.targetConditions[i]?.oligo_label).toBe(tcs[i].oligo_label)
            } else {
                for (let j=0; j < tcs[i].oligos!.length; j++) {
                    expect(puz.targetConditions[i]!.oligos![j].label).toBe(tcs[i].oligos![j].label);
                }
            }
        }
    });

    it('should properly generate oligo labels if not present', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.objective = [
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA'},
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA'},
            {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAU'},
            {type: 'multistrand', secstruct: '.', oligos: [
                {sequence: 'UUUU', malus: 0, name: ''},
                {sequence: 'UUUU', malus: 0, name: ''},
                {sequence: 'UUUA', malus: 0, name: ''},
            ]},
            {type: 'multistrand', secstruct: '.', oligos: [
                {sequence: 'AAAA', malus: 0, name: ''},
                {sequence: 'AAAU', malus: 0, name: ''},
                {sequence: 'AAAA', malus: 0, name: ''},
                {sequence: 'UUUU', malus: 0, name: ''},
                {sequence: 'UUUA', malus: 0, name: ''},
                {sequence: 'UUUU', malus: 0, name: ''},
            ]}
        ];

        expect(puz.targetConditions[0]?.oligo_label).toBe('A');
        expect(puz.targetConditions[1]?.oligo_label).toBe('A');
        expect(puz.targetConditions[2]?.oligo_label).toBe('B');
        expect(puz.targetConditions[3]?.oligos?.[0].label).toBe('C');
        expect(puz.targetConditions[3]?.oligos?.[1].label).toBe('C');
        expect(puz.targetConditions[3]?.oligos?.[2].label).toBe('D');
        expect(puz.targetConditions[4]?.oligos?.[0].label).toBe('A');
        expect(puz.targetConditions[4]?.oligos?.[1].label).toBe('B');
        expect(puz.targetConditions[4]?.oligos?.[2].label).toBe('A');
        expect(puz.targetConditions[4]?.oligos?.[3].label).toBe('C');
        expect(puz.targetConditions[4]?.oligos?.[4].label).toBe('D');
        expect(puz.targetConditions[4]?.oligos?.[5].label).toBe('C');
    });

    // Yes, this is a largely stupid test case, but I want to make sure the logic is correct JUST IN CASE
    it('should properly generate labels with > 26 oligos', () => {
        const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
        puz.objective = (new Array(70000)).fill(0).map((_, i) => ({
            type: 'oligo', secstruct: '.', oligo_sequence: 'A'.repeat(i + 1)
        }));
        expect(puz.targetConditions[26]?.oligo_label).toBe('AA');
        expect(puz.targetConditions[27]?.oligo_label).toBe('AB');
        expect(puz.targetConditions[52]?.oligo_label).toBe('BA');
        expect(puz.targetConditions[53]?.oligo_label).toBe('BB');
        expect(puz.targetConditions[(3*26**3) + (19*26**2) + (2*26**1) + 8]?.oligo_label).toBe('CSBI');
    });

    it('should error if there are a mix of oligos with and without labels', () => {
        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test'},
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA'},
            ]
        }).toThrowError();

        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'multistrand', secstruct: '.', oligos: [
                    {sequence: 'AAAA', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAU', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAA', malus: 0, name: ''},
                ]}
            ]
        }).toThrowError();

        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA'},
                {type: 'multistrand', secstruct: '.', oligos: [
                    {sequence: 'AAAA', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAU', malus: 0, name: '', label: 'test'},
                ]}
            ]
        }).toThrowError();

        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test'},
                {type: 'multistrand', secstruct: '.', oligos: [
                    {sequence: 'AAAA', malus: 0, name: ''},
                    {sequence: 'AAAU', malus: 0, name: ''},
                ]}
            ]
        }).toThrowError();

        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA', oligo_label: 'test'},
                {type: 'multistrand', secstruct: '.', oligos: [
                    {sequence: 'AAAA', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAU', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAA', malus: 0, name: ''},
                ]}
            ]
        }).toThrowError();

        expect(() => {
            const puz = new Puzzle(0, 'puzzle', PuzzleType.EXPERIMENTAL, 'author');
            puz.objective = [
                {type: 'oligo', secstruct: '.', oligo_sequence: 'AAAA'},
                {type: 'multistrand', secstruct: '.', oligos: [
                    {sequence: 'AAAA', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAU', malus: 0, name: '', label: 'test'},
                    {sequence: 'AAAA', malus: 0, name: ''},
                ]}
            ]
        }).toThrowError();
    })
})