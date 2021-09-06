import { DectectDevice } from "./DetectDevice";
import Mol3DView from "./Mol3DView"

export class Mol3DUI {

    private container: HTMLDivElement;
    private controlDiv: HTMLDivElement;
    private rb: HTMLDivElement;
    private lb: HTMLDivElement;
    private tb: HTMLDivElement;
    private mol3DView: Mol3DView;

    private width: number = 460;
    private height: number = 340;
    private top: number = 60;
    private right: number = 10;
    private minSize: number = 100;
    private margin: number = 10;

    private isMobile: boolean = false;

    constructor(mol3DView: Mol3DView) {
        this.mol3DView = mol3DView;
        this.isMobile = DectectDevice();
        if (this.isMobile) {
            this.right = document.body.clientWidth - (this.margin + this.width);
            this.top = 240;
        }

        this.container = <HTMLDivElement>document.createElement('div');
        this.container.style.backgroundColor = "rgba(2,35,71,0.6)";//"transparent";//"rgb(2,35,71)";
        this.container.classList.add("ngl-view-blur");

        this.container.style.border = '1px solid rgba(47, 148, 209, 0.9)'
        this.container.style.borderRadius = '5px'
        this.container.style.position = 'absolute';
        this.container.style.right = this.right + 'px';
        this.container.style.top = this.top + 'px';
        this.container.style.width = this.width + 'px';
        this.container.style.height = this.height + 'px';

        document.body.appendChild(this.container);

        this.init();
    }

    init() {
        this.create3DContainer();
        this.createControlDiv();
        this.createResizeElements();
    }

    get3DContainerPosition() {
        return { top: parseInt(this.container.style.top), height: parseInt(this.container.style.height), right: parseInt(this.container.style.right), width: parseInt(this.container.style.width) }
    }

    getVisibleState(): boolean {
        if (this.container.style.display.includes('none')) return false;
        else return true;
    }

    createControlDiv() {
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
                this.mol3DView.changeBackbone('change', selectedValue, { color: 0xFF8000 });
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
                this.mol3DView.changeBallstick('change', selectedValue, { extSugar: extSugar });
            })
        }
        var ballstickCheckBox = <HTMLInputElement>document.getElementById('ballstick');
        if (ballstickCheckBox) {
            ballstickCheckBox.addEventListener('change', () => {
                if (ballstickCheckBox.checked) {
                    var typeSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('typeSelect');
                    let selectedOption = typeSelect.options[typeSelect.selectedIndex];
                    let valArray = selectedOption.value.split(':');
                    const selectedValue = valArray[0];
                    let extSugar = true;
                    if (valArray.length > 1) {
                        extSugar = (parseInt(valArray[1]) > 0);
                    }
                    this.mol3DView.changeBallstick('create', selectedValue, { extSugar: extSugar });
                }
                else if (this.mol3DView.ballstickElement) {
                    this.mol3DView.changeBallstick('remove', null, null);
                }
            })
        }

        var backboneCheckBox = <HTMLInputElement>document.getElementById('backbone');
        if (backboneCheckBox) {
            backboneCheckBox.addEventListener('change', () => {
                if (backboneCheckBox.checked) {
                    var backboneSelect: HTMLSelectElement = <HTMLSelectElement>document.getElementById('backboneSelect');
                    let selectedOption = backboneSelect.options[backboneSelect.selectedIndex];
                    const selectedValue = selectedOption.value;
                    this.mol3DView.changeBackbone('create', selectedValue, { color: 0xFF8000 });
                }
                else if (this.mol3DView.backboneElement) {
                    this.mol3DView.changeBackbone('remove', null, null);
                }
            })
        }
        var baseCheckBox = <HTMLInputElement>document.getElementById('base');
        if (baseCheckBox) {
            baseCheckBox.addEventListener('change', () => {
                if (baseCheckBox.checked) {
                    this.mol3DView.changeBase('create');
                }
                else if (this.mol3DView.baseElement) {
                    this.mol3DView.changeBase('remove');
                }
            })
        }
        var blurCheckBox = <HTMLInputElement>document.getElementById('blur');
        if (blurCheckBox) {
            blurCheckBox.addEventListener('change', () => {
                if (blurCheckBox.checked) {
                    this.container.classList.add("ngl-view-blur");
                }
                else {
                    this.container.classList.remove("ngl-view-blur");
                }
            })
        }

        this.container.appendChild(controlDiv);
        this.controlDiv = controlDiv;
    }

    showScreen(bShow: boolean) {
        if (bShow) this.container.style.display = 'block';
        else this.container.style.display = 'none';
    }

    create3DContainer() {
        const _3DContainer = <HTMLDivElement>document.createElement('div');
        _3DContainer.id = "viewport";
        _3DContainer.style.position = 'relative';
        _3DContainer.style.right = '0px';
        _3DContainer.style.top = '0px';
        _3DContainer.style.width = '100%';
        _3DContainer.style.height = '100%';
        this.container.appendChild(_3DContainer);
    }

    createResizeElements() {
        const _LeftBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _LeftBottomResizeElement.style.position = 'absolute';
        _LeftBottomResizeElement.style.left = '0px';
        _LeftBottomResizeElement.style.bottom = '0px';
        _LeftBottomResizeElement.style.width = '20px';
        _LeftBottomResizeElement.style.height = '20px';
        _LeftBottomResizeElement.style.touchAction = 'none'
        const imageElement1 = document.createElement('img')
        imageElement1.style.position = 'relative';
        imageElement1.style.left = '0px';
        imageElement1.style.top = '0px';
        imageElement1.style.width = '100%'
        imageElement1.style.height = '100%'
        imageElement1.src = require("assets/UI/canvas_left.png");
        _LeftBottomResizeElement.appendChild(imageElement1);
        this.container.appendChild(_LeftBottomResizeElement);

        const _RightBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _RightBottomResizeElement.style.position = 'absolute';
        _RightBottomResizeElement.style.right = '0px';
        _RightBottomResizeElement.style.bottom = '0px';
        _RightBottomResizeElement.style.width = '20px';
        _RightBottomResizeElement.style.height = '20px';
        _RightBottomResizeElement.style.touchAction = 'none'
        const imageElement21 = document.createElement('img')
        imageElement21.style.position = 'relative';
        imageElement21.style.left = '0px';
        imageElement21.style.top = '0px';
        imageElement21.style.width = '100%'
        imageElement21.style.height = '100%'
        imageElement21.src = require("assets/UI/canvas_right.png");
        _RightBottomResizeElement.appendChild(imageElement21);
        this.container.appendChild(_RightBottomResizeElement);

        const _SettingElement = <HTMLDivElement>document.createElement('div');
        _SettingElement.style.position = 'relative';
        _SettingElement.style.left = '0px';
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
        _SettingElement.addEventListener('click', () => {
            if (this.controlDiv.style.display.includes('none')) {
                this.controlDiv.style.display = 'block';
            }
            else {
                this.controlDiv.style.display = 'none';
            }
        });
        _SettingElement.addEventListener('mouseenter', () => {
            imageElement3.src = require("assets/UI/setting_ngl_hover.png");
        });
        _SettingElement.addEventListener('mouseleave', () => {
            imageElement3.src = require("assets/UI/setting_ngl.png");
        });

        const _TitleBarElement = <HTMLDivElement>document.createElement('div');
        _TitleBarElement.style.position = 'absolute';
        _TitleBarElement.style.right = '0px';
        _TitleBarElement.style.top = '0px';
        _TitleBarElement.style.width = '100%';
        _TitleBarElement.style.height = '20px';
        _TitleBarElement.style.display = 'flex'
        _TitleBarElement.style.flexDirection = 'row'
        _TitleBarElement.style.justifyContent = 'center'
        _TitleBarElement.style.textAlign = 'center'
        _TitleBarElement.style.overflow = 'hidden'
        this.container.appendChild(_TitleBarElement);
        _TitleBarElement.appendChild(_SettingElement);

        const _inTitleBarElement = <HTMLDivElement>document.createElement('div');
        _inTitleBarElement.style.position = 'relative';
        _inTitleBarElement.style.left = '0px';
        _inTitleBarElement.style.top = '0px';
        _inTitleBarElement.style.width = 'calc(100% - 30px)';
        _inTitleBarElement.style.height = '100%';
        _inTitleBarElement.style.marginLeft = '4px'
        _inTitleBarElement.style.marginRight = '4px'
        // _inTitleBarElement.style.display = 'inline-block'
        _inTitleBarElement.style.display = 'flex'
        _inTitleBarElement.style.flexDirection = 'row'
        _inTitleBarElement.style.justifyContent = 'center'
        _inTitleBarElement.style.textAlign = 'center'
        _inTitleBarElement.style.overflow = 'hidden'
        _inTitleBarElement.style.touchAction = 'none'
        _TitleBarElement.appendChild(_inTitleBarElement);

        const imageElement10 = document.createElement('img')
        imageElement10.style.position = 'relative';
        imageElement10.style.left = '0px';
        imageElement10.style.top = '0px';
        imageElement10.style.width = 'auto'
        imageElement10.style.height = '100%'
        imageElement10.src = require("assets/UI/canvas_title.png");
        const imageElement11 = document.createElement('img')
        imageElement11.style.position = 'relative';
        imageElement11.style.left = '0px';
        imageElement11.style.top = '0px';
        imageElement11.style.width = 'auto'
        imageElement11.style.height = '100%'
        imageElement11.src = require("assets/UI/canvas_title.png");
        const _TxtElement = document.createElement('span');
        _TxtElement.textContent = "3D\u00a0STRUCTURE";
        _TxtElement.style.marginLeft = '2px'
        _TxtElement.style.marginRight = '2px'
        _TxtElement.style.width = '100%'
        _TxtElement.style.height = '100%'
        // _TxtElement.style.display = 'inline-block'
        _TxtElement.style.textAlign = 'center'

        const _MinimizeElement = <HTMLDivElement>document.createElement('div');
        _MinimizeElement.style.position = 'relative';
        _MinimizeElement.style.width = '20px';
        _MinimizeElement.style.height = '20px';
        _MinimizeElement.style.marginLeft = '5px'
        _MinimizeElement.style.marginRight = '5px'
        const imageElement4 = document.createElement('img')
        imageElement4.style.position = 'relative';
        imageElement4.style.left = '0px';
        imageElement4.style.top = '0px';
        imageElement4.style.width = '100%'
        imageElement4.style.height = '100%'
        imageElement4.src = require("assets/UI/canvas_dropdown.png");
        _MinimizeElement.appendChild(imageElement4);
        _MinimizeElement.addEventListener('click', () => {
            this.showScreen(false);
        });
        _MinimizeElement.addEventListener('mouseenter', () => {
            imageElement4.src = require("assets/UI/canvas_dropdown_hover.png");
        });
        _MinimizeElement.addEventListener('mouseleave', () => {
            imageElement4.src = require("assets/UI/canvas_dropdown.png");
        });
        _inTitleBarElement.appendChild(imageElement10);
        _inTitleBarElement.appendChild(_TxtElement);
        _inTitleBarElement.appendChild(imageElement11);
        _TitleBarElement.appendChild(_MinimizeElement);

        this.rb = _RightBottomResizeElement;
        this.lb = _LeftBottomResizeElement;
        this.tb = _inTitleBarElement;

        this.setResizeHandlers();
    }

    setResizeHandlers() {
        var lb = this.lb;
        var rb = this.rb;
        var tb = this.tb;

        let downElementID = 0;
        let down: boolean = false;
        let prevX: number = 0;
        let prevY: number = 0;

        function mousemove_LBListener() {
            lb.style.cursor = "sw-resize";
        }
        function mousemove_RBListener() {
            rb.style.cursor = "nw-resize";
        }
        function mousemove_MoveListener() {
            tb.style.cursor = "move";
        }
        lb.addEventListener('pointerdown', (e: PointerEvent) => {
            downElementID = 1;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) lb.removeEventListener('pointermove', mousemove_LBListener);
            capturePointerEvents();
        });
        if (!this.isMobile) lb.addEventListener('pointermove', mousemove_LBListener);

        rb.addEventListener('pointerdown', (e: PointerEvent) => {
            downElementID = 3;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) rb.removeEventListener('pointermove', mousemove_RBListener);
            capturePointerEvents();
        });
        if (!this.isMobile) rb.addEventListener('pointermove', mousemove_RBListener);

        tb.addEventListener('pointerdown', (e: PointerEvent) => {
            downElementID = 2;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) tb.removeEventListener('pointermove', mousemove_MoveListener);
            capturePointerEvents();
        });
        if (!this.isMobile) tb.addEventListener('pointermove', mousemove_MoveListener);

        var scope = this;

        function preventGlobalPointerEvents() {
            document.body.style.pointerEvents = 'none';
        }

        function restoreGlobalPointerEvents() {
            document.body.style.pointerEvents = 'auto';
        }

        function pointerMoveListener(e: PointerEvent) {
            if (down) {
                document.body.style.pointerEvents = 'none';
                var curX = e.screenX
                var curY = e.screenY
                if (downElementID == 1) { //resize leftBottom
                    if (scope.width - (curX - prevX) >= scope.minSize)
                        scope.width -= curX - prevX;
                    if (scope.height + curY - prevY >= scope.minSize)
                        scope.height += curY - prevY;
                    scope.container.style.width = scope.width + 'px';
                    scope.container.style.height = scope.height + 'px';
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

                    scope.container.style.top = scope.top + 'px';
                    scope.container.style.right = scope.right + 'px';
                }
                else if (downElementID == 3) { //resize rightBottom
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
                    scope.container.style.width = scope.width + 'px';
                    scope.container.style.height = scope.height + 'px';
                    scope.container.style.right = scope.right + 'px';
                }
                prevX = curX;
                prevY = curY;
                scope.mol3DView.component?.stage.handleResize();
            }
            // lb.style.cursor = "sw-resize";
        }

        function ponterUpListener() {
            restoreGlobalPointerEvents();
            document.removeEventListener('pointerup', ponterUpListener);
            document.removeEventListener('pointermove', pointerMoveListener);
        }

        function capturePointerEvents() {
            preventGlobalPointerEvents();
            document.addEventListener('pointerup', ponterUpListener);
            document.addEventListener('pointermove', pointerMoveListener);
        }
    }
}