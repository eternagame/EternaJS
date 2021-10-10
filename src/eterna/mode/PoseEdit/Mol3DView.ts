import * as NGL from 'ngl';
import PoseEditMode from './PoseEditMode';
import { RNABase } from 'eterna/EPars';
import Puzzle from 'eterna/puzzle/Puzzle';
import SecStruct from 'eterna/rnatypes/SecStruct';
import { DectectDevice } from './DetectDevice';
import Representation from 'ngl/dist/declarations/representation/representation';
import { Mol3DUI } from './Mol3DUI';
import ThreeView from 'eterna/ui/ThreeView';
import { Point } from '@pixi/math';

export interface PixiRenderCallback {
    (imgData: HTMLCanvasElement, width: number, height: number): void;
}
interface PixiCifCheckerCallback {
    (component: NGL.Structure | null): void;
}

export default class Mol3DView {
    stage: NGL.Stage;
    component: NGL.Component | null;
    backboneElement: NGL.RepresentationElement | null;
    baseElement: NGL.RepresentationElement | null;
    ballstickElement: NGL.RepresentationElement | null;
    public static scope: Mol3DView;
    poseEditMode: PoseEditMode;
    private readonly puzzle: Puzzle;
    colorChangeMap = new Map();
    hoverdInfo = { index: -1, color: 0, outColor: 0 };
    bShow: boolean = true;
    bShowAnnotations: boolean = true;
    isOver3DCanvas: boolean = false; //kkk
    metaState: boolean = false;
    mol3DUI: Mol3DUI;
    threeView: ThreeView; //

    myColorScheme = NGL.ColormakerRegistry.addScheme(function (this: any) {

        this.atomColor = function (atom: any) {
            var colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
            var color = 0;
            var atomResname = atom.resname;
            Mol3DView.scope.colorChangeMap.forEach((name, num) => {
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

    constructor(filePath: string | File | Blob, container: HTMLElement, threeView: ThreeView, callback: PixiRenderCallback, poseEditMode: PoseEditMode, _puzzle: Puzzle) {
        Mol3DView.scope = this;
        this.poseEditMode = poseEditMode;
        this.puzzle = _puzzle;
        this.threeView = threeView;

        // this.mol3DUI = new Mol3DUI(this);
        this.stage = new NGL.Stage(container, {}, callback);

        this.component = null;
        this.metaState = false;

        // window.addEventListener("resize", () => {
        //     this.stage.handleResize();
        // }, false);

        DectectDevice();
        threeView.mol3DView = this;

        this.create3D(filePath);
    }

    public PtInCanvas(x: number, y: number): boolean {
        return this.threeView.PtInCanvas(x, y)
    }
    public getPosition(): Point {
        return new Point(this.threeView.left, this.threeView.top + this.threeView.iconSize);
    }

    showScreen(bShow: boolean) {
        this.bShow = bShow;
        this.stage.viewer.requestRender();
    }
    getVisibleState(): boolean {
        return this.bShow;
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
        Mol3DView.scope.component?.viewer.selectEBaseObject(this.hoverdInfo.index - 1, false, color1);
    }

    //kkk
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

        const secstructs: string[] = this.puzzle.getSecstructs();
        var pairs = SecStruct.fromParens(secstructs[0]).pairs;

        this.stage.defaultFileParams = { firstModelOnly: true };
        this.stage.loadFile(filePath, { etherna_pairs: pairs }).then((component: void | NGL.Component) => {
            if (component) {
                this.component = component;
                this.updateSequence(this.poseEditMode.getSequence().split(' '));
                this.component.viewer.setHBondColor([0xFFFFFF, 0x8F9DC0, 0x546986]);
                this.baseElement = this.component.addRepresentation("ebase", { vScale: 0.5, color: Mol3DView.scope.myColorScheme });
                if (this.baseElement) {
                    var baseRepr: Representation = this.baseElement.repr;
                    if (baseRepr) {
                        var numBase = 1;
                        var seq = this.poseEditMode.getSequence().split(' ');
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
        if (!bShow) this.poseEditMode.hideAnnotations();
        this.stage.viewer.requestRender();
    }
    static checkModelFile(path: string | File | Blob) {
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


