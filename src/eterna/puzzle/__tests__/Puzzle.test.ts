import Eterna from "eterna/Eterna";
import Sequence from "eterna/rnatypes/Sequence";
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
        console.log(puz.barcodeIndices);
        expect(puz.getBarcodeHairpin(seq).sequenceString()).toBe('CCCUUUU');
    });
});
