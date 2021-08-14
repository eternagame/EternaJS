// import * as NGL from '../../../../../ngl/build/js/ngl.dev.js';
import * as NGL from 'ngl';
import PoseEditMode from './PoseEditMode';
// import PaintCursor from '../../pose2D/PaintCursor';
import { RNABase } from 'eterna/EPars';
import Eterna from 'eterna/Eterna';

export default class Mol3DView {

    private stage: NGL.Stage;
    private component: NGL.Component | null;
    backboneElement: NGL.RepresentationElement | null;
    baseElement: NGL.RepresentationElement | null;
    ballstickElement: NGL.RepresentationElement | null;
    static scope: Mol3DView;
    poseEditMode: PoseEditMode;
    colorChangeMap = new Map();
    hoverdInfo = { index: -1, color: 0, outColor: 0 };
    container0: HTMLDivElement;

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

            // if (atom.resno == Mol3DView.scope.hoverdInfo.index) {
            //     alphaColor = 0x80000000;
            // }
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
            // if (atom.resno == Mol3DView.scope.hoverdInfo.index) {
            //     // color += 0x7F000000 + Mol3DView.scope.hoverdInfo.color;
            //     switch (Mol3DView.scope.hoverdInfo.color) {
            //         case RNABase.ADENINE:
            //             color = colorArray[2];
            //             break;
            //         case RNABase.URACIL:
            //             color = colorArray[0];
            //             break;
            //         case RNABase.GUANINE:
            //             color = colorArray[1];
            //             break;
            //         case RNABase.CYTOSINE:
            //             color = colorArray[3];
            //             break;
            //         default:
            //             color = colorArray[0];
            //             break;
            //     }
            // }

            return color;
        }
    }, 'myColorScheme')

    constructor(poseEditMode: PoseEditMode) {
        Mol3DView.scope = this;
        this.poseEditMode = poseEditMode;
        this.createContainer();

        this.stage = new NGL.Stage("viewport");
        this.component = null;

        window.addEventListener("resize", () => {
            this.stage.handleResize();
        }, false);

        this.create3D();
    }

    showScreen(bShow: boolean) {
        if (bShow) this.container0.style.display = 'block';
        else this.container0.style.display = 'none';
    }
    getVisibleState(): boolean {
        if (this.container0.style.display.includes('none')) return false;
        else return true;
    }

    mouseHovered(index: number, color: number) {
        this.hoverdInfo.index = index;
        this.hoverdInfo.color = color;
        var colorArray = [0x3183c0, 0xaa1c20, 0xffff00, 0x1b7b3d];
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
        Mol3DView.scope.component?.viewer.selectEBaseObject(this.hoverdInfo.index - 1);
        Mol3DView.scope.component?.updateRepresentations({ color: this.myColorScheme });
    }

    updateSequence(seq: string) {
        for (var i = 0; i < seq.length; i++) {
            this.colorChangeMap.set(i + 1, seq[i]);
        }
        Mol3DView.scope.component?.updateRepresentations({ color: this.myColorScheme });
        // console.log(seq);
    }

    selectBase(index: number) {
        this.component?.viewer.selectEBaseObject(index);
    }
    deselectBase() {
        this.component?.viewer.deselectEBaseObject();
    }
    private createContainer(): HTMLDivElement {
        const controlDiv = <HTMLDivElement>document.createElement('div');
        controlDiv.style.position = 'absolute';
        controlDiv.style.right = '0px';
        controlDiv.style.top = '0px';
        controlDiv.style.display = 'flex';
        controlDiv.style.flexDirection = 'column';
        controlDiv.style.alignItems = 'flex-end';

        controlDiv.innerHTML = `
        <div>
        eBase:&nbsp&nbsp<input type="checkbox" checked id="base" style="width: 30px" />
        </div>
        <div>
        eBall+Stick:&nbsp&nbsp<select id="typeSelect">
                <option value="eball+stick:1" selected>Type 1</option>
                <option value="eball+stick:0" >Type 2</option>
                <!-- <option value="spacefill">spacefill</option> -->
                <!-- <option value="surface">surface</option> -->
            </select>&nbsp&nbsp<input type="checkbox" checked id="ballstick" style="width: 30px" />
        </div>
        <div>
        Back bone:&nbsp&nbsp<select id="backboneSelect">
            <option value="backbone" selected>Default</option>
            <option value="cartoon">Cartoon</option>
            <option value="tube">Tube</option>
        </select>&nbsp&nbsp<input type="checkbox" unchecked id="backbone" style="width: 30px"></input>
        </div>
      `;

        document.body.appendChild(controlDiv);

        var backboneSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('backboneSelect');
        if (backboneSelect) {
            backboneSelect.addEventListener('change', () => {
                let selectedOption = backboneSelect.options[backboneSelect.selectedIndex];
                const selectedValue = selectedOption.value;
                if (Mol3DView.scope.component && Mol3DView.scope.backboneElement) {
                    Mol3DView.scope.component.removeRepresentation(Mol3DView.scope.backboneElement);
                    Mol3DView.scope.backboneElement = Mol3DView.scope.component.addRepresentation(selectedValue, { color: Mol3DView.scope.myColorScheme })
                }
            })
        }
        var typeSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('typeSelect');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                let selectedOption = typeSelect.options[typeSelect.selectedIndex];
                let valArray = selectedOption.value.split(':');
                const selectedValue = valArray[0];
                let extSugar = true;
                if (valArray.length > 1) {
                    extSugar = (parseInt(valArray[1]) > 0);
                }
                if (Mol3DView.scope.component && Mol3DView.scope.ballstickElement) {
                    Mol3DView.scope.component.removeRepresentation(Mol3DView.scope.ballstickElement);
                    Mol3DView.scope.ballstickElement = Mol3DView.scope.component.addRepresentation(selectedValue, { extSugar: extSugar })
                }
            })
        }
        var ballstickCheckBox = <HTMLInputElement>document.getElementById('ballstick');
        if (ballstickCheckBox) {
            ballstickCheckBox.addEventListener('change', () => {
                if (Mol3DView.scope.component) {
                    if (ballstickCheckBox.checked) {
                        var typeSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('typeSelect');
                        let selectedOption = typeSelect.options[typeSelect.selectedIndex];
                        let valArray = selectedOption.value.split(':');
                        const selectedValue = valArray[0];
                        let extSugar = true;
                        if (valArray.length > 1) {
                            extSugar = (parseInt(valArray[1]) > 0);
                        }
                        Mol3DView.scope.ballstickElement = Mol3DView.scope.component.addRepresentation(selectedValue, { extSugar: extSugar })
                    }
                    else if (Mol3DView.scope.ballstickElement) {
                        Mol3DView.scope.component.removeRepresentation(Mol3DView.scope.ballstickElement);
                        Mol3DView.scope.ballstickElement = null;
                    }
                }
            })
        }

        var backboneCheckBox = <HTMLInputElement>document.getElementById('backbone');
        if (backboneCheckBox) {
            backboneCheckBox.addEventListener('change', () => {
                // console.log('backbone', backboneCheckBox.checked);
                if (Mol3DView.scope.component) {
                    if (backboneCheckBox.checked) {
                        var backboneSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('backboneSelect');
                        let selectedOption = backboneSelect.options[backboneSelect.selectedIndex];
                        const selectedValue = selectedOption.value;
                        Mol3DView.scope.backboneElement = Mol3DView.scope.component.addRepresentation(selectedValue, { color: Mol3DView.scope.myColorScheme })
                    }
                    else if (Mol3DView.scope.backboneElement) {
                        Mol3DView.scope.component.removeRepresentation(Mol3DView.scope.backboneElement);
                        Mol3DView.scope.backboneElement = null;
                    }
                }
            })
        }
        var baseCheckBox = <HTMLInputElement>document.getElementById('base');
        if (baseCheckBox) {
            baseCheckBox.addEventListener('change', () => {
                // console.log('base', baseCheckBox.checked)
                if (Mol3DView.scope.component) {
                    if (baseCheckBox.checked) {
                        Mol3DView.scope.baseElement = Mol3DView.scope.component.addRepresentation("ebase", { vScale: 0.5, color: Mol3DView.scope.myColorScheme })
                    }
                    else if (Mol3DView.scope.baseElement) {
                        Mol3DView.scope.component.removeRepresentation(Mol3DView.scope.baseElement);
                        Mol3DView.scope.baseElement = null;
                    }
                }
            })
        }


        this.container0 = <HTMLDivElement>document.createElement('div');
        this.container0.style.backgroundColor = "transparent";//"rgb(2,35,71)";
        this.container0.style.border = '1px solid #c0c0c0'
        this.container0.style.position = 'absolute';
        this.container0.style.right = '10px';
        this.container0.style.top = '50px';
        this.container0.style.width = '800px';
        this.container0.style.height = '600px';
        this.container0.style.zIndex = '10';
        this.container0.style.padding = '10px';
        const _3DContainer = <HTMLDivElement>document.createElement('div');
        _3DContainer.id = 'viewport';
        _3DContainer.style.position = 'absolute';
        _3DContainer.style.right = '0px';
        _3DContainer.style.top = '0px';
        _3DContainer.style.width = '100%';
        _3DContainer.style.height = '100%';
        this.container0.appendChild(_3DContainer);
        this.container0.appendChild(controlDiv);
        // document.body.appendChild(this.container0);
        var mainDivElement = <HTMLDivElement>document.getElementById(Eterna.PIXI_CONTAINER_ID);//document.getElementById('maingame');
        mainDivElement.appendChild(this.container0);
        return _3DContainer;
    }


    create3D() {
        const filePath = require('assets/data/3J9Z_chain_LB_5S_rRNA.cif');

        this.stage.loadFile(filePath).then((com: void | NGL.Component) => {

            const canvas = <HTMLDivElement>this.stage.viewer.container.childNodes[0].childNodes[0];//<HTMLDivElement>scope.container.children[0];
            canvas.style.removeProperty("background-color");
            canvas.id = 'viewport_canvas';
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            canvas.addEventListener("click", (event: MouseEvent) => event.preventDefault())

            if (com) {
                this.component = com;
                this.baseElement = this.component.addRepresentation("ebase", { vScale: 0.5, color: Mol3DView.scope.myColorScheme })
                this.ballstickElement = this.component.addRepresentation("eball+stick", { extSugar: true })
                this.component.autoView()
            }
        })
    }
}


