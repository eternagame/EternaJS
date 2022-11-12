import {BundledAnnotationData} from 'eterna/AnnotationManager';

export default interface SubmitPoseDetails {
    title: string | undefined;
    comment: string | undefined;
    annotations: BundledAnnotationData[];
    libraryNT: number[];
}
