//kkk Mol3DGate.ts --- manage 3d part of EternaGame

import * as NGL from 'ngl';
import { RNABase } from 'eterna/EPars';
import SecStruct from 'eterna/rnatypes/SecStruct';
import { DectectDevice } from './PoseEdit/DetectDevice';
import Representation from 'ngl/dist/declarations/representation/representation';
import ThreeView from './ThreeView';
import GameMode from './GameMode';

/*
test pattern
((((((((((.....((((((((....(((((((.............))))..)))...)))))).)).((.((....((((((((...))))))))....)).))...)))))))))).
*/
export interface PixiRenderCallback {
    (imgData: HTMLCanvasElement, width: number, height: number): void;
}
interface PixiCifCheckerCallback {
    (component: NGL.Structure | null): void;
}

export default class Mol3DGate {
    static inUpdating: boolean = false;
    stage: NGL.Stage;
    component: NGL.Component | null;
    backboneElement: NGL.RepresentationElement | null;
    baseElement: NGL.RepresentationElement | null;
    ballstickElement: NGL.RepresentationElement | null;
    public static scope: Mol3DGate;
    poseMode: GameMode;
    private readonly secStruct: string;
    colorChangeMap = new Map();
    hoverdInfo = { index: -1, color: 0, outColor: 0 };
    bShowAnnotations: boolean = true;
    threeView: ThreeView;
    _3DFilePath: string | File | Blob = '';

    myColorScheme = NGL.ColormakerRegistry.addScheme(function (this: any) {

        this.atomColor = function (atom: any) {
            // console.log('atom = ', atom);
            // console.log(atom)
            var colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
            var color = 0;
            var atomResname = atom.resname;
            Mol3DGate.scope.colorChangeMap.forEach((name, num) => {
                if (atom.resno == num) {
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
            }

            return color;
        }
    }, 'myColorScheme')

    constructor(filePath: string | File | Blob, container: HTMLElement, threeView: ThreeView, callback: PixiRenderCallback, poseMode: GameMode, _secStruct: string) {
        Mol3DGate.scope = this;
        this._3DFilePath = filePath;
        this.poseMode = poseMode;
        this.secStruct = _secStruct;
        this.threeView = threeView;

        this.stage = new NGL.Stage(container, { mousePreset: 'eterna' }, callback);

        this.component = null;

        DectectDevice();
        threeView.nglGate = this;

        this.create3D(filePath);
    }


    get isOver3DCanvas(): boolean {
        return this.threeView.isOver3DCanvas;
    }

    getBaseColor(color: number): number {
        let colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
        var color1: number = 0xFFFFFF;
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
    mouseHovered(index: number, color: number) {
        this.hoverdInfo.index = index;
        this.hoverdInfo.color = color;
        var color1: number = this.getBaseColor(color);
        Mol3DGate.scope.component?.viewer.selectEBaseObject(this.hoverdInfo.index - 1, false, color1);
    }

    updateSequence(seq: string[]) {
        for (var i = 0; i < seq[0].length; i++) {
            this.colorChangeMap.set(i + 1, seq[0][i]);
        }
        var numBase = 1;
        if (seq.length > 1) {
            numBase = parseInt(seq[1].split('-')[0]);
        }
        this.component?.viewer.setEthernaSequence(seq[0], numBase);
        this.component?.updateRepresentations({ color: this.myColorScheme });
        this.stage.viewer.requestRender();
    }

    changeBackbone(cmd: string, selectedValue: string | null, option: any | null) {
        if (cmd.includes("change")) {
            if (this.backboneElement) {
                this.component?.removeRepresentation(this.backboneElement);
                this.backboneElement = this.component?.addRepresentation(selectedValue, option)
            }
        }
        else if (cmd.includes("remove")) {
            if (this.backboneElement) this.component?.removeRepresentation(this.backboneElement);
            this.backboneElement = null;
        }
        else if (cmd.includes("create")) {
            this.backboneElement = this.component?.addRepresentation(selectedValue, option)
        }
    }
    changeBallstick(cmd: string, selectedValue: string | null, option: any | null) {
        if (cmd.includes("change")) {
            if (this.ballstickElement) {
                this.component?.removeRepresentation(this.ballstickElement);
                this.ballstickElement = this.component?.addRepresentation(selectedValue, option);
            }
        }
        else if (cmd.includes("remove")) {
            if (this.ballstickElement) this.component?.removeRepresentation(this.ballstickElement);
            this.ballstickElement = null;
        }
        else if (cmd.includes("create")) {
            this.ballstickElement = this.component?.addRepresentation(selectedValue, option);
        }
    }
    changeBase(cmd: string) {
        if (cmd.includes("remove")) {
            if (this.baseElement) this.component?.removeRepresentation(this.baseElement);
            this.baseElement = null;
        }
        else if (cmd.includes("create")) {
            this.baseElement = this.component?.addRepresentation("ebase", { vScale: 0.5, color: this.myColorScheme })
        }
    }
    create3D(filePath: string | File | Blob) {
        this.stage.removeAllComponents();
        this.component = null;

        var pairs = SecStruct.fromParens(this.secStruct).pairs;

        this.stage.defaultFileParams = { firstModelOnly: true };
        this.stage.loadFile(filePath, { etherna_pairs: pairs }).then((component: void | NGL.Component) => {
            if (component) {
                this.component = component;
                this.updateSequence(this.poseMode.getSequence().split(' '));
                this.component.viewer.setHBondColor([0xFFFFFF, 0x8F9DC0, 0x546986, 0xFFFFFF]);
                this.baseElement = this.component.addRepresentation("ebase", { vScale: 0.5, color: Mol3DGate.scope.myColorScheme });
                if (this.baseElement) {
                    var baseRepr: Representation = this.baseElement.repr;
                    if (baseRepr) {
                        var numBase = 1;
                        var seq = this.poseMode.getSequence().split(' ');
                        if (seq.length > 1) {
                            numBase = parseInt(seq[1].split('-')[0]);
                        }
                        var annotations = baseRepr.getAnnotations();
                        var i = 0;
                        annotations.forEach((a: any) => {
                            var num = numBase + a.num;
                            if (i == 0 || i == annotations.length - 1 || (num % 5) == 0) {
                                let vector = new NGL.Vector3(a.x, a.y, a.z);
                                component.addAnnotation(vector, num + '', {});
                            }
                            i++;
                        })
                    }
                }
                // this.ballstickElement = this.component.addRepresentation("eball+stick", { extSugar: true })
                this.backboneElement = this.component.addRepresentation("backbone", { color: 0xFF8000 })
                this.component.autoView()
            }
        })
    }
    showAnnotations(bShow: boolean) {
        this.bShowAnnotations = bShow;
        if (!bShow) this.threeView.hideAnnotations();
        else this.stage.viewer.requestRender();
    }
    static checkModelFile(path: string | File | Blob, seq: string) {
        let promise: Promise<any>
        var result = 0;
        function ModelCallback(obj: NGL.Structure): void {
            result = obj.chainStore.residueCount[0];
        }
        var callback: PixiCifCheckerCallback = <PixiCifCheckerCallback>ModelCallback;
        promise = NGL.Stage.checkModelFile(path, callback);
        return promise.then(() => { return result })
    }
}


