import SecStruct from "eterna/rnatypes/SecStruct";
import Sequence from "eterna/rnatypes/Sequence";
import Folder from "../Folder";
import NuPACK from "../NuPACK";

test(`NuPACK:Multifold`, () => {
    expect.assertions(3);
    return expect(NuPACK.create()
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                expect(true).toBeTruthy();
                return;
            }

            let fold = (folder as Folder).multifold(
                Sequence.fromSequenceString('UAAGUUCUGA'),
                null,
                [{
                    malus: 9.934087678014993,
                    name: 'A',
                    sequence: Sequence.fromSequenceString('UCGGAACUUAGCUUAGAUGUGUGCAUUGAAUACGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGUAUUCGAUGUGCACU').baseArray
                }]
            );

            expect(fold).toBeDefined()
            expect(fold!.pairs.getParenthesis()).toEqual('((((((((((.))))))))))........(((((((((((((((((((((((((((((((....))))))))))))))))))))))))))))))).');
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:scoreStructures (multistrand)`, () => {
    expect.assertions(3);
    return expect(NuPACK.create()
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                expect(true).toBeTruthy();
                return;
            }

            const nnfes: number[] = [];
            const energy = folder.scoreStructures(
                Sequence.fromSequenceString('UAAGUUCUGA&UCGGAACUUAGCUUAGAUGUGUGCAUUGAAUACGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGUAUUCGAUGUGCACU', true),
                SecStruct.fromParens('((((((((((.))))))))))........(((((((((((((((((((((((((((((((....))))))))))))))))))))))))))))))).'),
                false,
                37,
                nnfes
            );

            expect(energy).toBe(-5452);
            expect(nnfes).toEqual([
                -2,  409,   -1, -200,   59,  210,   58, -170,   57, -110,   56,
              -100,   55, -140,   54, -180,   53,  -90,   52, -180,   51, -210,
                50, -110,   49, -170,   48, -230,   47,  -90,   46, -110,   45,
               -50,   44, -230,   43, -200,   42, -210,   41, -110,   40,  -90,
                39,  -90,   38, -230,   37, -120,   36, -110,   35,  -90,   34,
              -180,   33, -210,   32,  -20,   31, -210,   30, -180,   29, -210,
                 9,    0,    8, -230,    7, -120,    6, -190,    5, -230,    4,
               -90,    3, -210,    2, -170,    1,  -90,    0, -110
            ]);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:scoreStructures (multistrand, partially paired)`, () => {
    expect.assertions(3);
    return expect(NuPACK.create()
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                expect(true).toBeTruthy();
                return;
            }

            const nnfes: number[] = [];
            const energy = folder.scoreStructures(
                Sequence.fromSequenceString('UAAGUUCUGA&UCGGAACUUAGCUUAGAUGGUUGCGUUGAAUUCGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGGGUUCCAUCUGCAGU', true),
                SecStruct.fromParens('................................((((..((((((((((((((((((((((....))))))))))))))))))))))....))))..'),
                false,
                37,
                nnfes
            );

            expect(energy).toBe(-3171);
            expect(nnfes).toEqual([
                -1, -100, 59,  210, 58, -170, 57, -110,
                56, -100, 55, -140, 54, -180, 53,  -90,
                52, -180, 51, -210, 50, -110, 49, -170,
                48, -230, 47,  -90, 46, -110, 45,  -50,
                44, -230, 43, -200, 42, -140, 41,  -40,
                40, -100, 39,  -90, 38, -230, 35,  330,
                34, -120, 33, -340, 32, -180
            ]);

            console.log(energy);
            console.log(nnfes);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});
