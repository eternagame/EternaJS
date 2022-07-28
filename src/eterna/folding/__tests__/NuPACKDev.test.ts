//import Folder, {MultiFoldResult} from '../Folder';
import Folder, {DefectResult, SuboptEnsembleResult} from '../Folder';
import NuPACK from '../NuPACK';
//import Vienna from '../Vienna';
//import Vienna2 from '../Vienna2';
//import LinearFoldV from '../LinearFoldV';
import './jest-matcher-deep-close-to';
//import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import SecStruct from 'eterna/rnatypes/SecStruct';
//import {Oligo} from 'eterna/rnatypes/Oligo';

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

/*

test('NuPACK:suboptstructuresNoOligos', () => {        
  return expect(CreateFolder(NuPACK)
  .then((folder) => {
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
     
     let ensembleDefect: number = suboptEnsembleObject.ensembleDefect;
     let ensembleDefectNormalized: number = suboptEnsembleObject.ensembleDefectNormalized;
     let mfeDefect: number = suboptEnsembleObject.mfeDefect;
     let mfeDefectNormalized: number = suboptEnsembleObject.mfeDefectNormalized;
//console.log(ensembleStructures);

     expect(ensembleStructures).toBeDefined();
     expect(ensembleStructures[0])
         .toEqual(".....((((((.....))))))..............(((((..(((....)))..)))))................(((((((....))))))).....................");
     expect(ensembleStructures[1])
         .toEqual(".....((((((.....))))))..............(((((..............)))))................(((((((....))))))).....................");
     expect(ensembleStructures[2])
         .toEqual(".....((((((.....))))))..............(((((..((......))..)))))................(((((((....))))))).....................");
         
     expect(ensembleStructuresEnergyError).toBeDefined();
  

     expect(ensembleStructuresFreeEnergy).toBeDefined();
     expect(ensembleStructuresFreeEnergy[0])
         .toEqual(-28.499999999999996);
     expect(ensembleStructuresFreeEnergy[1])
         .toEqual(-28.199999999999996);
     expect(ensembleStructuresFreeEnergy[2])
         .toEqual(-27.599999999999998);
             
     expect(ensembleDefect).toBeDefined();
     expect(ensembleDefect)
     .toEqual(4.665742668072042);

     expect(ensembleDefectNormalized).toBeDefined();
     expect(ensembleDefectNormalized)
     .toEqual(0.0405716753745395);

     expect(mfeDefect).toBeDefined();
     expect(mfeDefect)
     .toEqual(0);

     expect(mfeDefectNormalized).toBeDefined();
     expect(mfeDefectNormalized)
         .toEqual(0);

 }))
 .resolves.toBeUndefined(); // (we're returning a promise)

});


*/
test('NuPACK:defect', () => {        
    return expect(CreateFolder(NuPACK)
    .then((folder) => {
       if (folder === null) return;
  
       let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
       let secstruct = SecStruct.fromParens(".....((((((.....))))))....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
       let temperature: number = 37;
       let isPsuedoknot:boolean = true;
       let mode: number = 3;
  
        const defectResultObject: 
           DefectResult = folder.getDefect (sequence, secstruct, 
                                mode, isPsuedoknot, temperature
        );	   
       
        let ensembleDefect: number = defectResultObject.ensembleDefect;
        let ensembleDefectNormalized: number = defectResultObject.ensembleDefectNormalized;
        let mfeDefect: number = defectResultObject.mfeDefect;
        let mfeDefectNormalized: number = defectResultObject.mfeDefectNormalized;
  
        expect(ensembleDefect).toBeDefined();
        expect(ensembleDefect)
        //.toEqual(4.665742668072042);
        .toEqual(12.32201764700784);
   
        expect(ensembleDefectNormalized).toBeDefined();
        expect(ensembleDefectNormalized)
        .toEqual(0.1071479795391986);
   
        expect(mfeDefect).toBeDefined();
        expect(mfeDefect)
        //.toEqual(10);
        .toEqual(10);
   
        expect(mfeDefectNormalized).toBeDefined();
        expect(mfeDefectNormalized)
            //.toEqual(0.08695652173913043);
        .toEqual(0.08695652173913043);
      
   }))
   .resolves.toBeUndefined(); // (we're returning a promise)
  
  });


test('NuPACK:suboptstructuresNoOligosPknot', () => {        
  return expect(CreateFolder(NuPACK)
  .then((folder) => {
     if (folder === null) return;

     let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
     let temperature: number = 37;
     let isPsuedoknot:boolean = true;
     let kcalDelta: number = 4;

     const suboptEnsembleObject: 
         SuboptEnsembleResult = folder.getSuboptEnsembleNoBindingSite (
         sequence, kcalDelta,
         isPsuedoknot, temperature
     );	   
     

     let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
     let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
     let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
     
 //console.log(ensembleStructures);

     expect(ensembleStructures).toBeDefined();
     expect(ensembleStructures[0])
         .toEqual(".....((((((.....))))))....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
     expect(ensembleStructures[1])
         .toEqual(".....((((((.....))))))....(((((((...{{{{..))))))).......}}}}................(((((((....))))))).....................");
     expect(ensembleStructures[2])
         .toEqual("......(((((.....))))).....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
/*
         expect(ensembleStructures[0])
         .toEqual(".....((((((.....))))))....(((((((...(((((.)))))))......)))))................(((((((....))))))).....................");
     expect(ensembleStructures[1])
         .toEqual(".....((((((.....))))))....(((((((...((((..))))))).......))))................(((((((....))))))).....................");
     expect(ensembleStructures[2])
         .toEqual("......(((((.....))))).....(((((((...(((((.)))))))......)))))................(((((((....))))))).....................");
         */
     expect(ensembleStructuresEnergyError).toBeDefined();
  

     expect(ensembleStructuresFreeEnergy).toBeDefined();
     expect(ensembleStructuresFreeEnergy[0])
         .toEqual(-34.6);
     expect(ensembleStructuresFreeEnergy[1])
         .toEqual(-33.3);
     expect(ensembleStructuresFreeEnergy[2])
         .toEqual(-33);

 }))
 .resolves.toBeUndefined(); // (we're returning a promise)

});

/*
test('NuPACK:multifold', () => {        
    return expect(CreateFolder(NuPACK)
      .then((folder) => {
       if (folder === null) return;
       
        let bigSeq:string = "UCGGAACUUAGCUUAGAUGGUUGCGUUGAAUUCGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGGGUUCCAUCUGCAGU";
        let oligoSeq:string = "CGCAACCAUC";
        //let sequence = Sequence.fromSequenceString("cgcaaccuac");
        let sequence = Sequence.fromSequenceString(bigSeq);
        //2,3,2,1,1,2,2,4,1,2
        //should represent CGCAACCAUC
        let oligos: Oligo[] = new Array(1);
        //oligos[0].sequence=Sequence.fromSequenceString("UCGGAACUUAGCUUAGAUGGUUGCGUUGAAUUCGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGGGUUCCAUCUGCAGU");
        oligos[0] = {sequence: Sequence.fromSequenceString(oligoSeq).baseArray, malus:0};
        //oligos[0] = {sequence: [4, 2, 3, 3, 1, 1, 2, 4, 4, 1, 3, 2, 4, 4, 1, 3, 1, 4, 3, 3, 4, 4, 3, 2, 3, 4, 4, 3, 1, 1, 4, 4, 2, 3, 1,
        //                    3, 1, 4, 2, 4, 1, 2, 1, 4, 3, 3, 4, 1, 3, 4, 4, 2, 3, 2, 4, 1, 4, 2, 1, 4, 3, 4, 1, 3, 1, 4, 4, 4, 2, 3, 3, 3
        //                   , 4, 4, 2, 2, 1, 4, 2, 4, 3, 2, 1, 3, 4], malus: 0};
        //UCGGAACUUAGCUUAGAUGGUUGCGUUGAAUUCGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGGGUUCCAUCUGCAGU
        //let temperature: number = 37;
          //let isPsuedoknot:boolean = false;
        let desiredPairs = null;
        let secstruct = null;
      
    
      const MultiFoldResultObject: 
      MultiFoldResult | undefined = folder.multifold (
        sequence, secstruct, oligos ,desiredPairs, 37  
        );	   
      
    
    
    let pairs: SecStruct = (MultiFoldResultObject as MultiFoldResult).pairs;
    
    console.log(pairs);
    
    expect(pairs).toBeDefined();
     

   }))
   .resolves.toBeUndefined(); // (we're returning a promise)

});

*/
