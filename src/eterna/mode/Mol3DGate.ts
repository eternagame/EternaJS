// Mol3DGate.ts --- manage 3d part of EternaGame

import {
    StageEx,
    ViewerEx,
    Component,
    RepresentationElement,
    PixiRenderCallback,
    Colormaker,
    AtomProxy,
    ColormakerRegistry,
    MouseActions,
    DivAnnotation,
    Vector3,
    Structure,
    getFileInfo,
    ParserRegistry,
    autoLoad
} from 'ngl';
import {RNABase} from 'eterna/EPars';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameMode from './GameMode';

export default class Mol3DGate {
    public stageEx: StageEx;
    public viewerEx: ViewerEx;
    public component: Component | null;
    protected backboneElement: RepresentationElement | null;
    protected baseElement: RepresentationElement | null;
    public static scope: Mol3DGate;
    protected poseMode: GameMode;
    private readonly secStruct: string;
    protected colorChangeMap = new Map();
    protected hoverdInfo = {index: -1, color: 0, outColor: 0};
    public bShowAnnotations: boolean = true;
    public _3DFilePath: string | File | Blob = '';

    protected myColorScheme: string;

    constructor(
        filePath: string | File | Blob,
        container: HTMLDivElement,
        callback: PixiRenderCallback,
        poseMode: GameMode,
        _secStruct: string
    ) {
        Mol3DGate.scope = this;
        this._3DFilePath = filePath;
        this.poseMode = poseMode;
        this.secStruct = _secStruct;

        const scheme = function baseColorScheme(this: Colormaker) {
            this.atomColor = function getColor(atom: AtomProxy): number {
                const colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
                let color = 0;
                let atomResname = atom.resname;
                Mol3DGate.scope.colorChangeMap.forEach((name, num) => {
                    if (atom.resno === num) {
                        atomResname = name;
                    }
                });

                switch (atomResname) {
                    case 'U':
                        color = colorArray[0];
                        break;
                    case 'G':
                        color = colorArray[1];
                        break;
                    case 'A':
                        color = colorArray[2];
                        break;
                    case 'C':
                        color = colorArray[3];
                        break;
                    default:
                        break;
                }

                return color;
            };
        };
        this.myColorScheme = ColormakerRegistry.addScheme(
            scheme,
            'myColorScheme'
        );

        this.stageEx = new StageEx(container, {}, callback);
        this.viewerEx = <ViewerEx> this.stageEx.viewer;
        this.stageEx.mouseControls.clear();
        this.stageEx.mouseControls.add('scroll', MouseActions.zoomScroll);
        this.stageEx.mouseControls.add('drag-left', MouseActions.panDrag);
        this.stageEx.mouseControls.add(
            'drag-ctrl-left',
            MouseActions.rotateDrag
        );
        this.stageEx.mouseControls.add(
            'drag-shift-left',
            MouseActions.zoomDrag
        );
        this.stageEx.mouseControls.add('drag-right', MouseActions.rotateDrag);
        this.stageEx.mouseControls.add('clickPick-left', ViewerEx.movePick);
        this.stageEx.mouseControls.add('hoverPick', ViewerEx.tooltipPick);

        this.component = null;

        this.create3D(filePath);
    }

    public getBaseColor(color: number): number {
        const colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
        let color1 = 0xffffff;
        switch (color) {
            case RNABase.ADENINE:
                color1 = colorArray[2];
                break;
            case RNABase.URACIL:
                color1 = colorArray[0];
                break;
            case RNABase.GUANINE:
                color1 = colorArray[1];
                break;
            case RNABase.CYTOSINE:
                color1 = colorArray[3];
                break;
            default:
                color1 = colorArray[0];
                break;
        }
        return color1;
    }

    public mouse2DHovered(index: number, color: number) {
        this.hoverdInfo.index = index;
        this.hoverdInfo.color = color;
        const color1: number = this.getBaseColor(color);
        this.viewerEx?.hoverEBaseObject(
            this.hoverdInfo.index - 1,
            false,
            color1
        );
    }

    public updateSequence(seq: string[]) {
        for (let i = 0; i < seq[0].length; i++) {
            this.colorChangeMap.set(i + 1, seq[0][i]);
        }
        let numBase = 1;
        if (seq.length > 1) {
            numBase = parseInt(seq[1].split('-')[0], 10);
        }
        this.viewerEx.setEthernaSequence(seq[0], numBase);
        this.component?.updateRepresentations({color: this.myColorScheme});
        this.viewerEx.requestRender();
    }

    public changeBase(cmd: string) {
        if (cmd.includes('remove')) {
            if (this.baseElement) this.component?.removeRepresentation(this.baseElement);
            this.baseElement = null;
        } else if (cmd.includes('create')) {
            this.baseElement = this.component?.addRepresentation('ebase', {
                vScale: 0.5,
                color: this.myColorScheme
            });
        }
    }

    public create3D(filePath: string | File | Blob) {
        this.stageEx.removeAllComponents();
        this.component = null;

        const pairs = SecStruct.fromParens(this.secStruct).pairs;

        this.stageEx.defaultFileParams = {firstModelOnly: true};
        this.stageEx
            .loadFile(filePath, {}, pairs)
            .then((component: void | Component) => {
                if (component) {
                    this.component = component;
                    this.updateSequence(this.poseMode.getSequence().split(' '));
                    this.viewerEx.setHBondColor([
                        0xffffff, 0x8f9dc0, 0x546986, 0xffffff
                    ]);
                    this.baseElement = this.component.addRepresentation(
                        'ebase',
                        {vScale: 0.5, color: Mol3DGate.scope.myColorScheme}
                    );
                    if (this.baseElement) {
                        const baseRepr = this.baseElement.repr;
                        if (baseRepr) {
                            let numBase = 1;
                            const seq = this.poseMode.getSequence().split(' ');
                            if (seq.length > 1) {
                                numBase = parseInt(seq[1].split('-')[0], 10);
                            }
                            const annotations = baseRepr.getAnnotations();
                            let i = 0;
                            annotations.forEach((a: DivAnnotation) => {
                                const num = numBase + a.num;
                                if (
                                    i === 0
                                    || i === annotations.length - 1
                                    || num % 5 === 0
                                ) {
                                    const vector = new Vector3(a.x, a.y, a.z);
                                    component.addAnnotationEx(
                                        vector,
                                        `${num}`,
                                        {}
                                    );
                                }
                                i++;
                            });
                        }
                    }
                    this.backboneElement = this.component.addRepresentation(
                        'backbone',
                        {color: 0xff8000}
                    );
                    this.component.autoView();
                    this.viewerEx.spark.setURL(Bitmaps.BonusSymbol);
                }
            });
    }

    public showAnnotations(bShow: boolean) {
        this.bShowAnnotations = bShow;
        if (!bShow) GameMode._3DView?.hideAnnotations();
        else this.viewerEx.requestRender();
    }

    public static async checkModelFile(path: string | File | Blob) {
        const ext = getFileInfo(path).ext;

        if (ParserRegistry.isTrajectory(ext)) {
            throw new Error(`loadFile: ext '${ext}' is a trajectory and must be loaded into a structure component`);
        }

        const object = await autoLoad(path);

        if (object instanceof Structure) return object.chainStore.residueCount[0];
        else return 0;
    }

    public dispose() {
        this.stageEx.dispose();
        GameMode._3DView?.dispose();
    }
}
