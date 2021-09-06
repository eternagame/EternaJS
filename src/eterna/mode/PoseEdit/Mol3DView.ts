// import * as NGL from '../../../../../ngl/build/js/ngl.dev.js';
import * as NGL from 'ngl';
import PoseEditMode from './PoseEditMode';
// import PaintCursor from '../../pose2D/PaintCursor';
import { RNABase } from 'eterna/EPars';
import Puzzle from 'eterna/puzzle/Puzzle';
import SecStruct from 'eterna/rnatypes/SecStruct';
// import Eterna from 'eterna/Eterna';
// import xxx from '../../../../assets/data/'
import { DectectDevice } from './DetectDevice';
import { Mol3DUI } from './Mol3DUI';

export default class Mol3DView {
    stage: NGL.Stage;
    component: NGL.Component | null;
    backboneElement: NGL.RepresentationElement | null;
    baseElement: NGL.RepresentationElement | null;
    ballstickElement: NGL.RepresentationElement | null;
    static scope: Mol3DView;
    poseEditMode: PoseEditMode;
    private readonly puzzle: Puzzle;
    colorChangeMap = new Map();
    hoverdInfo = { index: -1, color: 0, outColor: 0 };
    mol3DUI: Mol3DUI;

    myColorScheme = NGL.ColormakerRegistry.addScheme(function (this: any) {

        this.atomColor = function (atom: any) {
            // console.log('atom = ', atom);
            // console.log(atom)
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

    constructor(poseEditMode: PoseEditMode, _puzzle: Puzzle) {
        Mol3DView.scope = this;
        this.poseEditMode = poseEditMode;
        this.puzzle = _puzzle;

        this.mol3DUI = new Mol3DUI(this);
        this.stage = new NGL.Stage("viewport");
        this.component = null;

        window.addEventListener("resize", () => {
            this.stage.handleResize();
        }, false);

        DectectDevice()

        this.create3D();
    }

    showScreen(bShow: boolean) {
        this.mol3DUI.showScreen(bShow);
    }
    getVisibleState(): boolean {
        return this.mol3DUI.getVisibleState();
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
        Mol3DView.scope.component?.viewer.selectEBaseObject(this.hoverdInfo.index - 1, color1);
    }

    updateSequence(seq: string) {
        for (var i = 0; i < seq.length; i++) {
            this.colorChangeMap.set(i + 1, seq[i]);
        }
        this.component?.viewer.setEthernaSequence(seq);
        this.component?.updateRepresentations({ color: this.myColorScheme });
    }

    public get3DContainerPosition() {
        return this.mol3DUI.get3DContainerPosition();
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
    create3D() {
        const filePath = require('assets/data/test.cif');
        // const filePath = require('assets/data/4ybb_16S.cif')
        const secstructs: string[] = this.puzzle.getSecstructs();
        var pairs = SecStruct.fromParens(secstructs[0]).pairs;
        // console.log(pairs)

        this.stage.loadFile(filePath, { etherna_pairs: pairs }).then((component: void | NGL.Component) => {

            const canvas = <HTMLDivElement>this.stage.viewer.container.childNodes[0].childNodes[0];
            canvas.style.removeProperty("background-color");
            canvas.id = 'viewport_canvas';
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            canvas.addEventListener("click", (event: MouseEvent) => event.preventDefault())

            if (component) {
                this.component = component;
                this.baseElement = this.component.addRepresentation("ebase", { vScale: 0.5, color: Mol3DView.scope.myColorScheme });
                // this.ballstickElement = this.component.addRepresentation("eball+stick", { extSugar: true })
                this.backboneElement = this.component.addRepresentation("backbone", { color: 0xFF8000 })
                this.component.autoView()
            }
        })
    }
}


