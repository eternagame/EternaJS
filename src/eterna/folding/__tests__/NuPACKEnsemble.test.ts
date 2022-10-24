import Folder, {SuboptEnsembleResult} from '../Folder';
import NuPACK from '../NuPACK';
import './jest-matcher-deep-close-to';
import Sequence from 'eterna/rnatypes/Sequence';
import SecStruct from 'eterna/rnatypes/SecStruct';

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

test('NuPACK:defect', () => {        
    return expect((CreateFolder(NuPACK)).then((folder) => {
        if (folder === null) return; 
        
        let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
        let secstruct = SecStruct.fromParens(".....((((((.....))))))..............(((((..(((....)))..)))))................(((((((....))))))).....................");
        let temperature: number = 37;
        let isPsuedoknot:boolean = false;
        
        const ensembleDefect: number = folder.getDefect (sequence, secstruct, temperature, isPsuedoknot );	   
        
        expect(ensembleDefect).toBeDefined();
        expect(ensembleDefect).toEqual(4.665742668072042);
    })).resolves.toBeUndefined(); // (we're returning a promise)
});

test('NuPACK:suboptstructuresNoOligos', () => {        
    return expect(CreateFolder(NuPACK).then((folder) => {
        if (folder === null) return;

        let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
        let temperature: number = 37;
        let isPsuedoknot:boolean = false;
        let kcalDelta: number = 4;

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
            .toEqual(".....((((((.....))))))..............(((((..(((....)))..)))))................(((((((....))))))).....................");
        expect(ensembleStructures[1])
            .toEqual(".....((((((.....))))))..............(((((..............)))))................(((((((....))))))).....................");
        expect(ensembleStructures[2])
            .toEqual(".....((((((.....))))))..............(((((..((......))..)))))................(((((((....))))))).....................");

        expect(ensembleStructuresEnergyError).toBeDefined();

        expect(ensembleStructuresFreeEnergy).toBeDefined();
        expect(ensembleStructuresFreeEnergy[0]).toEqual(-28.499999999999996);
        expect(ensembleStructuresFreeEnergy[1]).toEqual(-28.199999999999996);
        expect(ensembleStructuresFreeEnergy[2]).toEqual(-27.599999999999998);
    })).resolves.toBeUndefined(); // (we're returning a promise)
});

test('NuPACK:suboptstructuresNoOligosPknot', () => {        
    return expect(CreateFolder(NuPACK).then((folder) => {
        if (folder === null) return;
        
        let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
        let temperature: number = 37;
        let isPsuedoknot:boolean = true;
        let kcalDelta: number = 4;
        
        const suboptEnsembleObject: SuboptEnsembleResult = folder.getSuboptEnsembleNoBindingSite(
            sequence, kcalDelta,
            isPsuedoknot, temperature
        );
        
        let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
        let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
        let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
        
        expect(ensembleStructures).toBeDefined();
        expect(ensembleStructures[0])
            .toEqual(".....((((((.....))))))....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
        expect(ensembleStructures[1])
            .toEqual(".....((((((.....))))))....(((((((...{{{{..))))))).......}}}}................(((((((....))))))).....................");
        expect(ensembleStructures[2])
            .toEqual("......(((((.....))))).....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
        
        expect(ensembleStructuresEnergyError).toBeDefined();
        
        expect(ensembleStructuresFreeEnergy).toBeDefined();
        expect(ensembleStructuresFreeEnergy[0]).toEqual(-34.6);
        expect(ensembleStructuresFreeEnergy[1]).toEqual(-33.3);
        expect(ensembleStructuresFreeEnergy[2]).toEqual(-33);
    })).resolves.toBeUndefined(); // (we're returning a promise)
});
    
test('NuPACK:suboptstructuresWithOligos', () => {        
    return expect(CreateFolder(NuPACK).then((folder) => {
        if (folder === null) return;
        
        let sequence = Sequence.fromSequenceString("auauauagaaaauauaua")
        let oligos: string[] = ["acgcga", "auguau"];
        let temperature: number = 37;
        let isPsuedoknot:boolean = false;
        let kcalDelta: number = 1;

        const suboptEnsembleObject: SuboptEnsembleResult = folder.getSuboptEnsembleWithOligos (
            sequence, oligos, kcalDelta, 
            isPsuedoknot, temperature
        );	   
        

        let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
        let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
        let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
        
        
        expect(ensembleStructures).toBeDefined();
        expect(ensembleStructures[0]).toEqual(".(((((.(..........&.)....&))))).");           

        expect(ensembleStructuresEnergyError).toBeDefined();
        expect(ensembleStructuresEnergyError[0]).toEqual(0);
        

        expect(ensembleStructuresFreeEnergy).toBeDefined();
        expect(ensembleStructuresFreeEnergy[0]).toEqual(-5.462702838158919);
   })).resolves.toBeUndefined(); // (we're returning a promise)
});
