export interface Oligo {
    malus: number;
    name?: string;
    label?: string;
    sequence: number[];
}

export enum OligoMode {
    DIMER = 1,
    EXT3P = 2,
    EXT5P = 3
}
