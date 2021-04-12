// pose2DState.ts
export interface Mut {
    pos: number;
    base: string;
}

export default class Pose2DState {
    muts: Mut[] = [];
    lockUpdated: boolean = false;
    bindingSiteUpdated: boolean = false;
    designStructUpdated: boolean = false;
}
