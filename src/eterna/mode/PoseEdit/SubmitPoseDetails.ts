import {AnnotationGraph} from 'eterna/ui/AnnotationItem';

export default interface SubmitPoseDetails {
    title: string | undefined;
    comment: string | undefined;
    annotations: AnnotationGraph;
}
