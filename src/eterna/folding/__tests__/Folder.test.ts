import Folder, {SuboptEnsembleResult} from '../Folder';
import NuPACK from '../NuPACK';
import Vienna from '../Vienna';
import Vienna2 from '../Vienna2';
import LinearFoldV from '../LinearFoldV';
import './jest-matcher-deep-close-to';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';


const SNOWFLAKE_SEQ = Sequence.fromSequenceString('GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC');
const SNOWFLAKE_STRUCT = SecStruct.fromParens('((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))');

const BASIC_SEQ = Sequence.fromSequenceString('AAAAAAAAAAAAAA');
const BASIC_RESULT = new SecStruct([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);

const ZIPPERS_SEQ = Sequence.fromSequenceString('AAAAAGGGGAAAAAAAAACCCCAGCGGAAAAAACUGCAAA');
const ZIPPERS_BEST_PAIRS = SecStruct.fromParens('.....((((.........)))).((((......))))...');
const ZIPPERS_TEMP = 37;

function FoldSequence(folder: Folder, seq: Sequence, struct: SecStruct): SecStruct | null {
    return folder.foldSequence(seq, null, struct.getParenthesis());
}

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

test('NuPACK:suboptstructuresNoOligos', () => {        
     return expect(CreateFolder(NuPACK)
     .then((folder) => {
        if (folder === null) return;

        let sequence = Sequence.fromSequenceString("auauauagaaaauauaua")
        let temperature: number = 37;
        let isPsuedoknot:boolean = false;
        let kcalDelta: number = 1;

        const suboptEnsembleObject: 
            SuboptEnsembleResult = folder.getSuboptEnsembleNoBindingSite (
            sequence, kcalDelta, 
            isPsuedoknot, temperature
        );	   
        
  
        let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
        let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
        let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
        

        expect(ensembleStructures).toBeDefined();
        expect(ensembleStructures[0])
            .toEqual(".((((((.....))))))");
        expect(ensembleStructures[1])
            .toEqual("((((((.....)))))).");
        expect(ensembleStructures[2])
            .toEqual("..(((((.....))))).");

        expect(ensembleStructuresEnergyError).toBeDefined();
        expect(ensembleStructuresEnergyError[0])
            .toEqual(0);
        expect(ensembleStructuresEnergyError[1])
            .toEqual(0.30000000000000027);
        expect(ensembleStructuresEnergyError[2])
            .toEqual(0.5000000000000002);

        expect(ensembleStructuresFreeEnergy).toBeDefined();
        expect(ensembleStructuresFreeEnergy[0])
            .toEqual(-2.5);
        expect(ensembleStructuresFreeEnergy[1])
            .toEqual(-2.1999999999999997);
        expect(ensembleStructuresFreeEnergy[2])
            .toEqual(-1.9999999999999998);

    }))
    .resolves.toBeUndefined(); // (we're returning a promise)

});

test('NuPACK:suboptstructuresWithOligos', () => {        
     return expect(CreateFolder(NuPACK)
       .then((folder) => {
        if (folder === null) return;
        
        let sequence = Sequence.fromSequenceString("auauauagaaaauauaua")
        let oligos: string[] = ["acgcga", "auguau"];
        let temperature: number = 37;
        let isPsuedoknot:boolean = false;
        let kcalDelta: number = 1;

        const suboptEnsembleObject: 
            SuboptEnsembleResult = folder.getSuboptEnsembleWithOligos (
            sequence, oligos, kcalDelta, 
            isPsuedoknot, temperature
        );	   
        
  
        let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
        let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
        let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
       
        
        expect(ensembleStructures).toBeDefined();
        expect(ensembleStructures[0])
            .toEqual(".(((((.(..........&.)....&))))).");           

        expect(ensembleStructuresEnergyError).toBeDefined();
        expect(ensembleStructuresEnergyError[0])
            .toEqual(0);
       

        expect(ensembleStructuresFreeEnergy).toBeDefined();
        expect(ensembleStructuresFreeEnergy[0])
            .toEqual(-5.462702838158919);
      

    }))
    .resolves.toBeUndefined(); // (we're returning a promise)

});


for (let folderType of [Vienna, Vienna2, NuPACK, LinearFoldV]) {
    test(`${folderType.NAME}:snowflake`, () => {
        // expect.assertions: the async code should result in X assertions being called
        // https://facebook.github.io/jest/docs/en/expect.html#expectassertionsnumber
        expect.assertions(2);
        return expect(CreateFolder(folderType)
            .then((folder: any) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    return;
                }

                expect(FoldSequence(folder, SNOWFLAKE_SEQ, SNOWFLAKE_STRUCT)).toBeTruthy();
            }))
            .resolves.toBeUndefined();
    });

    

    test(`${folderType.NAME}:emptyStructure`, () => {
        expect.assertions(2);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    return;
                }

                const p1 = FoldSequence(folder, BASIC_SEQ, new SecStruct())?.pairs;

                // console.error(p1);
                // console.error(BASIC_RESULT.pairs);
                expect(p1).toEqual(BASIC_RESULT.pairs);
            }))
            .resolves.toBeUndefined();
    });

    test(`${folderType.NAME}:cachedQuery`, () => {
        expect.assertions(2);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    return;
                }

                const p1 = FoldSequence(folder, BASIC_SEQ, new SecStruct())?.pairs;
                const p2 = FoldSequence(folder, BASIC_SEQ, new SecStruct())?.pairs;
                // console.error(p1);
                // console.error(p2);
                expect([p1, p2]).toEqual([BASIC_RESULT.pairs, BASIC_RESULT.pairs]);
            }))
            .resolves.toBeUndefined();
    });

    test(`${folderType.NAME}:score_structures`, () => {
        // The engines output different results

        const TOTAL_FE: Map<string, number> = new Map([
            [Vienna.NAME, -1080],
            [Vienna2.NAME, -1019.999],
            [NuPACK.NAME, -1111],
            [LinearFoldV.NAME, -1019.999],
        ]);

        const NNFE: Map<string, number[]> = new Map([
            [Vienna.NAME, [-1,-360,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [Vienna2.NAME, [-1,-300,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [NuPACK.NAME, [-1,-360,26,360,25,-190,24,-120,23,-340,8,410,7,-290,6,-290,5,-290]],
            [LinearFoldV.NAME, [8,530,7,-330,6,-330,5,-330,26,430,25,-210,24,-140,23,-340,-1,-300]],
        ]);

        let expectedTotalFe = TOTAL_FE.get(folderType.NAME);
        if (expectedTotalFe === undefined) {
            throw new Error("Total FE gold standard energy missing from TOTAL_FE!");
        }
        let expectedNNFE = NNFE.get(folderType.NAME);
        if (expectedNNFE === undefined) {
            throw new Error("NNFE gold standard energy missing from NNFE!");
        }

        expect.assertions(3);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    expect(true).toBeTruthy();
                    return;
                }

                let outNNFE: number[] = [];
                let totalFe = folder.scoreStructures(
                    ZIPPERS_SEQ,
                    ZIPPERS_BEST_PAIRS,
                    false,
                    ZIPPERS_TEMP,
                    outNNFE);

                expect(totalFe).toBeCloseTo(expectedTotalFe!);
                expect(outNNFE).toEqual(expectedNNFE!);
            }))
            .resolves.toBeUndefined(); // (we're returning a promise)
    });

    test(`${folderType.NAME}:get_dot_plot(simple)`, () => {
        expect.assertions(2);
        const SEQ = Sequence.fromSequenceString('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        const STRUCT = SecStruct.fromParens('........................................');
        return expect(CreateFolder(folderType)
            .then((folder) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    return;
                }

                const calcdResult = folder.getDotPlot(
                    SEQ,
                    STRUCT,
                    37
                );

                expect(calcdResult?.data).toEqual([]);
            }))
            .resolves.toBeUndefined();
    });

    test(`${folderType.NAME}:get_dot_plot(complex)`, () => {
        expect.assertions(2);
        const SEQ = Sequence.fromSequenceString('AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA');
        const STRUCT = SecStruct.fromParens('.....((((.........)))).((((......))))...');

        const RESULT: Map<string, number[]> = new Map([
            [Vienna.NAME, [6,20,0.003204861,6,21,0.050702623,6,22,0.994967823,6,37,0.014707212,7,20,0.050686163,7,21,0.997305727,7,22,0.049737799,7,36,0.014697534,8,19,0.048807822,8,20,0.997265654,8,21,0.049896478,8,35,0.014696120,9,19,0.981161504,9,20,0.048955465,9,34,0.014664345,19,24,0.007318126,19,26,0.006963470,19,27,0.007932088,20,25,0.006957857,20,26,0.007936614,20,27,0.007544318,21,25,0.006246202,21,26,0.007525488,24,36,0.036388827,24,37,0.996200675,25,35,0.036287239,25,36,0.998544617,25,37,0.035832064,26,34,0.035331676,26,35,0.998545990,26,36,0.035898986,27,34,0.982421238,27,35,0.035432802,22,6,0.9500000,21,7,0.9500000,20,8,0.9500000,19,9,0.9500000,37,24,0.9500000,36,25,0.9500000,35,26,0.9500000,34,27,0.9500000]],
            [Vienna2.NAME, [6,20,0.003988738,6,21,0.063180796,6,22,0.990143360,6,37,0.010712919,7,19,0.003988932,7,20,0.063162002,7,21,0.994601699,7,22,0.080314175,7,36,0.010755485,8,19,0.062911053,8,20,0.994635139,8,21,0.080430352,8,22,0.005083604,8,35,0.010755360,9,19,0.993906409,9,20,0.080288216,9,21,0.005089970,9,34,0.010736979,19,27,0.010233688,20,26,0.010250062,21,25,0.010084667,24,35,0.004329294,24,36,0.042500942,24,37,0.993037693,25,34,0.004338242,25,35,0.042344422,25,36,0.997512167,25,37,0.053864061,26,34,0.042051181,26,35,0.997550468,26,36,0.053844965,26,37,0.005520726,27,34,0.996686512,27,35,0.053666033,27,36,0.005535491,22,6,0.9500000,21,7,0.9500000,20,8,0.9500000,19,9,0.9500000,37,24,0.9500000,36,25,0.9500000,35,26,0.9500000,34,27,0.9500000]],
            [NuPACK.NAME, [6,20,0.00008970054198092353,6,21,0.011729698180047701,6,22,0.9518105848284347,6,37,0.00013243831310604377,7,19,0.00008966039871562371,7,20,0.011765385207831875,7,21,0.9706162858666628,7,22,0.01646028859436443,7,36,0.0001335489962994577,8,19,0.01165052568341233,8,20,0.9707744900721356,8,21,0.016940341777949973,8,22,0.00012670333368449728,8,35,0.000133538023219132,9,19,0.9675496328284401,9,20,0.016956501549632304,9,21,0.00012999690753806768,9,34,0.0001330854144430546,19,27,0.00011754782629591105,20,26,0.00011791135581604513,20,27,0.000011669987801284624,21,25,0.00011089605008890967,21,26,0.000011523889683633583,24,35,0.000029551724038800597,24,36,0.003875727609563238,24,37,0.9498782980469551,25,34,0.000029769294840305784,25,35,0.003914869980310296,25,36,0.9688162119970055,25,37,0.026286887200841713,26,34,0.003873729342074498,26,35,0.9689829022099249,26,36,0.02661923191621384,26,37,0.00020224064169583236,27,34,0.9666645006689871,27,35,0.02659916084138646,27,36,0.00020447901551065852]],
            [LinearFoldV.NAME, [6, 21,   0.004033207893371582, 6, 22,      0.980380117893219, 6, 37,  0.0001462996006011963, 7, 20,   0.004030853509902954, 7, 21,     0.9892160892486572, 7, 22,   0.006421893835067749, 7, 36,  0.0001468956470489502, 8, 19,   0.003999501466751099, 8, 20,     0.9892876744270325, 8, 21,   0.006440162658691406, 8, 35, 0.00014690309762954712, 9, 19,       0.98785001039505, 9, 20,   0.006417781114578247, 9, 34,  0.0001466497778892517, 19, 27, 0.00013893842697143555, 20, 26, 0.00013919919729232788, 21, 25, 0.00013643503189086914, 24, 36,  0.0018515288829803467, 24, 37,     0.9861026406288147, 25, 35,  0.0018385015428066254, 25, 36,     0.9949905276298523, 25, 37,  0.0028720200061798096, 26, 34,  0.0018141455948352814, 26, 35,     0.9950662851333618, 26, 36,   0.002869546413421631, 27, 34,      0.993351936340332, 27, 35,   0.002846658229827881]],
        ]);

        let expectedResult = RESULT.get(folderType.NAME);

        return expect(CreateFolder(folderType)
            .then((folder) => {
                if (folder === null) {
                    expect(true).toBeTruthy();
                    return;
                }
                
                const calcdResult = folder.getDotPlot(
                    SEQ,
                    STRUCT,
                    37
                );

                expect(calcdResult?.data).toBeDeepCloseTo(expectedResult, 5);
            }))
            .resolves.toBeUndefined();
    });
}