import {AnnotationData} from 'eterna/AnnotationManager';

export default interface SubmitPoseDetails {
    title: string | undefined;
    comment: string | undefined;
    annotations: AnnotationData[];
    libraryNT: number[];
}
