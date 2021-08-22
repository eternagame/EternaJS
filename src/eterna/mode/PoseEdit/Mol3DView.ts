// import * as NGL from '../../../../../ngl/build/js/ngl.dev.js';
import * as NGL from 'ngl';
import PoseEditMode from './PoseEditMode';
// import PaintCursor from '../../pose2D/PaintCursor';
import { RNABase } from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
// import xxx from '../../../../assets/data/'

export default class Mol3DView {
    stage: NGL.Stage;
    component: NGL.Component | null;
    backboneElement: NGL.RepresentationElement | null;
    baseElement: NGL.RepresentationElement | null;
    ballstickElement: NGL.RepresentationElement | null;
    static scope: Mol3DView;
    poseEditMode: PoseEditMode;
    colorChangeMap = new Map();
    hoverdInfo = { index: -1, color: 0, outColor: 0 };
    container0: HTMLDivElement;
    width: number = 800;
    height: number = 600;
    top: number = 100;
    right: number = 10;
    minSize: number = 100;
    margin: number = 10;

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
        Mol3DView.scope.component?.updateRepresentations({ color: this.myColorScheme });
    }

    updateSequence(seq: string) {
        for (var i = 0; i < seq.length; i++) {
            this.colorChangeMap.set(i + 1, seq[i]);
        }
        Mol3DView.scope.component?.updateRepresentations({ color: this.myColorScheme });
    }

    private createContainer(): HTMLDivElement {
        const controlDiv = <HTMLDivElement>document.createElement('div');
        controlDiv.style.position = 'absolute';
        controlDiv.style.right = '0px';
        controlDiv.style.top = '24px';
        controlDiv.style.display = 'flex';
        controlDiv.style.flexDirection = 'column';
        controlDiv.style.alignItems = 'flex-end';
        controlDiv.style.display = 'none';

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
            </select>&nbsp&nbsp<input type="checkbox" unchecked id="ballstick" style="width: 30px" />
        </div>
        <div>
        Back bone:&nbsp&nbsp<select id="backboneSelect">
            <option value="backbone" selected>Default</option>
            <option value="cartoon">Cartoon</option>
            <option value="tube">Tube</option>
        </select>&nbsp&nbsp<input type="checkbox" checked id="backbone" style="width: 30px"></input>
        </div>
        <div>
        Blur:&nbsp&nbsp<input type="checkbox" checked id="blur" style="width: 30px" />
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
                    Mol3DView.scope.backboneElement = Mol3DView.scope.component.addRepresentation(selectedValue, { color: 0xFF8000 })
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
                        Mol3DView.scope.backboneElement = Mol3DView.scope.component.addRepresentation(selectedValue, { color: 0xFF8000 })
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
        var blurCheckBox = <HTMLInputElement>document.getElementById('blur');
        if (blurCheckBox) {
            blurCheckBox.addEventListener('change', () => {
                if (blurCheckBox.checked) {
                    this.container0.classList.add("ngl-view");
                }
                else {
                    this.container0.classList.remove("ngl-view");
                }
            })
        }


        this.container0 = <HTMLDivElement>document.createElement('div');
        this.container0.style.backgroundColor = "rgba(2,35,71,0.6)";//"transparent";//"rgb(2,35,71)";
        this.container0.classList.add("ngl-view");

        this.container0.style.border = '1px solid #c0c0c0'
        this.container0.style.borderRadius = '8px'
        this.container0.style.position = 'absolute';
        this.container0.style.right = this.right + 'px';
        this.container0.style.top = this.top + 'px';
        this.container0.style.width = this.width + 'px';
        this.container0.style.height = this.height + 'px';

        document.body.appendChild(this.container0);

        const _3DContainer = <HTMLDivElement>document.createElement('div');
        _3DContainer.id = 'viewport';
        _3DContainer.style.position = 'relative';
        _3DContainer.style.right = '0px';
        _3DContainer.style.top = '0px';
        _3DContainer.style.width = '100%';
        _3DContainer.style.height = '100%';
        this.container0.appendChild(_3DContainer);

        const _LeftTopResizeElement = <HTMLDivElement>document.createElement('div');
        _LeftTopResizeElement.style.position = 'absolute';
        _LeftTopResizeElement.style.left = '0px';
        _LeftTopResizeElement.style.top = '0px';
        _LeftTopResizeElement.style.width = '20px';
        _LeftTopResizeElement.style.height = '20px';
        const imageElement = document.createElement('img')
        imageElement.style.position = 'relative';
        imageElement.style.left = '0px';
        imageElement.style.top = '0px';
        imageElement.style.width = '100%'
        imageElement.style.height = '100%'
        imageElement.src = require("assets/UI/leftup_move.png");
        _LeftTopResizeElement.appendChild(imageElement);
        this.container0.appendChild(_LeftTopResizeElement);

        const _LeftBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _LeftBottomResizeElement.style.position = 'absolute';
        _LeftBottomResizeElement.style.left = '0px';
        _LeftBottomResizeElement.style.bottom = '0px';
        _LeftBottomResizeElement.style.width = '20px';
        _LeftBottomResizeElement.style.height = '20px';
        const imageElement1 = document.createElement('img')
        imageElement1.style.position = 'relative';
        imageElement1.style.left = '0px';
        imageElement1.style.top = '0px';
        imageElement1.style.width = '100%'
        imageElement1.style.height = '100%'
        imageElement1.src = require("assets/UI/leftbottom_move.png");
        _LeftBottomResizeElement.appendChild(imageElement1);
        this.container0.appendChild(_LeftBottomResizeElement);

        const _RightBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _RightBottomResizeElement.style.position = 'absolute';
        _RightBottomResizeElement.style.right = '0px';
        _RightBottomResizeElement.style.bottom = '0px';
        _RightBottomResizeElement.style.width = '20px';
        _RightBottomResizeElement.style.height = '20px';
        const imageElement21 = document.createElement('img')
        imageElement21.style.position = 'relative';
        imageElement21.style.left = '0px';
        imageElement21.style.top = '0px';
        imageElement21.style.width = '100%'
        imageElement21.style.height = '100%'
        imageElement21.src = require("assets/UI/rightbottommove.png");
        _RightBottomResizeElement.appendChild(imageElement21);
        this.container0.appendChild(_RightBottomResizeElement);

        const _MoveElement = <HTMLDivElement>document.createElement('div');
        _MoveElement.style.position = 'absolute';
        _MoveElement.style.right = '5px';
        _MoveElement.style.top = '0px';
        _MoveElement.style.width = '20px';
        _MoveElement.style.height = '20px';
        _MoveElement.style.margin = '0px'
        const imageElement2 = document.createElement('img')
        imageElement2.style.position = 'relative';
        imageElement2.style.left = '0px';
        imageElement2.style.top = '0px';
        imageElement2.style.width = '100%'
        imageElement2.style.height = '100%'
        imageElement2.src = require("assets/UI/move_canvas.png");
        _MoveElement.appendChild(imageElement2);
        this.container0.appendChild(_MoveElement);

        const _SettingElement = <HTMLDivElement>document.createElement('div');
        _SettingElement.style.position = 'absolute';
        _SettingElement.style.right = '30px';
        _SettingElement.style.top = '0px';
        _SettingElement.style.width = '20px';
        _SettingElement.style.height = '20px';
        _SettingElement.style.margin = '0px'
        const imageElement3 = document.createElement('img')
        imageElement3.style.position = 'relative';
        imageElement3.style.left = '0px';
        imageElement3.style.top = '0px';
        imageElement3.style.width = '100%'
        imageElement3.style.height = '100%'
        imageElement3.src = require("assets/UI/setting_ngl.png");
        _SettingElement.appendChild(imageElement3);
        this.container0.appendChild(_SettingElement);
        _SettingElement.addEventListener('click', () => {
            if (controlDiv.style.display.includes('none')) {
                controlDiv.style.display = 'block';
            }
            else {
                controlDiv.style.display = 'none';
            }
        });
        _SettingElement.addEventListener('mouseenter', (e) => {
            imageElement3.src = require("assets/UI/setting_ngl_hover.png");
        });
        _SettingElement.addEventListener('mouseleave', (e) => {
            imageElement3.src = require("assets/UI/setting_ngl.png");
        });

        const _MinimizeElement = <HTMLDivElement>document.createElement('div');
        _MinimizeElement.style.position = 'absolute';
        _MinimizeElement.style.right = '55px';
        _MinimizeElement.style.top = '0px';
        _MinimizeElement.style.width = '20px';
        _MinimizeElement.style.height = '20px';
        _MinimizeElement.style.margin = '0px'
        const imageElement4 = document.createElement('img')
        imageElement4.style.position = 'relative';
        imageElement4.style.left = '0px';
        imageElement4.style.top = '0px';
        imageElement4.style.width = '100%'
        imageElement4.style.height = '100%'
        imageElement4.src = require("assets/UI/minimize_canvas.png");
        _MinimizeElement.appendChild(imageElement4);
        this.container0.appendChild(_MinimizeElement);
        _MinimizeElement.addEventListener('click', () => {
            this.showScreen(false);
        });
        _MinimizeElement.addEventListener('mouseenter', (e) => {
            imageElement4.src = require("assets/UI/minimize_canvas_hover.png");
        });
        _MinimizeElement.addEventListener('mouseleave', (e) => {
            imageElement4.src = require("assets/UI/minimize_canvas.png");
        });

        let downElementID = 0;
        let down: boolean = false;
        let prevX: number = 0;
        let prevY: number = 0;
        function mousemove_LeftBottomListener(e) {
            _LeftBottomResizeElement.style.cursor = "sw-resize";
        }
        function mousemove_LeftTopListener(e) {
            _LeftTopResizeElement.style.cursor = "nw-resize";
        }
        function mousemove_RightBottomListener(e) {
            _RightBottomResizeElement.style.cursor = "nw-resize";
        }
        function mousemove_MoveListener(e) {
            _MoveElement.style.cursor = "move";
        }
        _LeftTopResizeElement.addEventListener('pointerdown', (e) => {
            downElementID = 0;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            _LeftTopResizeElement.removeEventListener('pointermove', mousemove_LeftTopListener);
            captureMouseEvents(e);
        });
        _LeftTopResizeElement.addEventListener('pointermove', mousemove_LeftTopListener);

        _LeftBottomResizeElement.addEventListener('pointerdown', (e) => {
            downElementID = 1;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            _LeftBottomResizeElement.removeEventListener('pointermove', mousemove_LeftBottomListener);
            captureMouseEvents(e);
        });
        _LeftBottomResizeElement.addEventListener('pointermove', mousemove_LeftBottomListener);

        _RightBottomResizeElement.addEventListener('pointerdown', (e) => {
            downElementID = 3;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            _RightBottomResizeElement.removeEventListener('pointermove', mousemove_RightBottomListener);
            captureMouseEvents(e);
        });
        _RightBottomResizeElement.addEventListener('pointermove', mousemove_RightBottomListener);

        _MoveElement.addEventListener('pointerdown', (e) => {
            downElementID = 2;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            _MoveElement.removeEventListener('pointermove', mousemove_MoveListener);
            captureMouseEvents(e);
        });
        _MoveElement.addEventListener('pointermove', mousemove_MoveListener);

        var scope = this;

        function preventGlobalMouseEvents() {
            document.body.style.pointerEvents = 'none';
        }

        function restoreGlobalMouseEvents() {
            document.body.style.pointerEvents = 'auto';
        }

        function mousemoveListener(e) {
            if (down) {
                document.body.style.pointerEvents = 'none';
                var curX = e.screenX
                var curY = e.screenY
                if (downElementID == 1) { //resize leftBottom
                    if (scope.width - (curX - prevX) >= scope.minSize)
                        scope.width -= curX - prevX;
                    if (scope.height + curY - prevY >= scope.minSize)
                        scope.height += curY - prevY;
                    scope.container0.style.width = scope.width + 'px';
                    scope.container0.style.height = scope.height + 'px';
                }
                else if (downElementID == 0) { //resize leftTop
                    if (scope.width - (curX - prevX) >= scope.minSize)
                        scope.width -= curX - prevX;
                    if (scope.top + curY - prevY >= scope.margin && scope.height - (curY - prevY) >= scope.minSize) {
                        scope.height -= curY - prevY;
                        scope.top += curY - prevY;
                    }
                    scope.container0.style.top = scope.top + 'px';
                    scope.container0.style.width = scope.width + 'px';
                    scope.container0.style.height = scope.height + 'px';
                }
                else if (downElementID == 2) { //move
                    var right = scope.right - (curX - prevX);
                    if (right < scope.margin) right = scope.margin;
                    else if (right + scope.width + scope.margin > document.body.clientWidth) right = document.body.clientWidth - scope.width - scope.margin;
                    scope.right = right;

                    var top = scope.top + curY - prevY;
                    if (top < scope.margin) top = scope.margin;
                    else if (top + scope.height + scope.margin > document.body.clientHeight) top = document.body.clientHeight - scope.height - scope.margin;
                    scope.top = top;

                    scope.container0.style.top = scope.top + 'px';
                    scope.container0.style.right = scope.right + 'px';
                }
                else { //resize rightBottom
                    var right = scope.right - (curX - prevX);
                    if (right < scope.margin) right = scope.margin;

                    if (scope.width - (right - scope.right) >= scope.minSize) {
                        scope.width -= (right - scope.right);
                        scope.right = right;
                    }

                    var height = scope.height + curY - prevY;
                    if (height >= scope.minSize) {
                        if (height + scope.top + scope.margin > document.body.clientHeight) height = document.body.clientHeight - scope.top - scope.margin;
                        scope.height = height;
                    }
                    scope.container0.style.width = scope.width + 'px';
                    scope.container0.style.height = scope.height + 'px';
                    scope.container0.style.right = scope.right + 'px';
                }
                prevX = curX;
                prevY = curY;
                scope.component?.stage.handleResize();
            }
            _LeftBottomResizeElement.style.cursor = "sw-resize";
        }

        function mouseupListener(e) {
            restoreGlobalMouseEvents();
            document.removeEventListener('mouseup', mouseupListener);
            document.removeEventListener('mousemove', mousemoveListener);
            _LeftTopResizeElement.addEventListener('pointermove', mousemove_LeftTopListener);
            _LeftBottomResizeElement.addEventListener('pointermove', mousemove_LeftBottomListener);
        }

        function captureMouseEvents(e) {
            preventGlobalMouseEvents();
            document.addEventListener('mouseup', mouseupListener);
            document.addEventListener('mousemove', mousemoveListener);
        }

        this.container0.appendChild(controlDiv);

        return _3DContainer;
    }


    create3D() {
        const filePath = require('assets/data/test.cif');
        // const filePath = require('assets/data/4ybb_16S.cif')

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
                // this.ballstickElement = this.component.addRepresentation("eball+stick", { extSugar: true })
                this.backboneElement = this.component.addRepresentation("backbone", { color: 0xFF8000 })
                this.component.autoView()
            }
        })
    }
}


