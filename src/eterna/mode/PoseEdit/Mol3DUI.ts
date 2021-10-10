import { DectectDevice } from "./DetectDevice";
import Mol3DView from "./Mol3DView"

export class Mol3DUI {

    private container: HTMLDivElement;
    private contentContainer: HTMLDivElement;
    private rb: HTMLDivElement;
    private lb: HTMLDivElement;
    private tb: HTMLDivElement;
    private cb: HTMLImageElement;

    private mol3DView: Mol3DView;

    public static BOTTOM_H: number = 70;
    public static TOP: number = 50;

    private prevWidth: number = 460;
    private prevHeight: number = 340;
    private prevTop: number = Mol3DUI.TOP;
    private prevRight: number = 10;

    private width: number = 460;
    private height: number = 340;
    private top: number = Mol3DUI.TOP;
    private right: number = 10;
    private minSize: number = 100;
    private margin: number = 10;
    private titleH: number = 20;

    private isMobile: boolean = false;

    private bMax: boolean = false;
    private bMin: boolean = false;
    private maxImage: HTMLImageElement;
    private minImage: HTMLImageElement;

    constructor(mol3DView: Mol3DView) {
        this.mol3DView = mol3DView;
        this.isMobile = DectectDevice();
        if (this.isMobile) {
            this.right = document.body.clientWidth - (this.margin + this.width);
            this.top = 240;
        }

        this.container = <HTMLDivElement>document.createElement('div');
        this.container.style.backgroundColor = "rgba(2,35,71,0.6)";
        this.container.style.border = '1px solid rgba(47, 148, 209, 0.9)'
        this.container.style.borderRadius = '5px'
        this.container.style.position = 'absolute';
        this.container.style.right = this.right + 'px';
        this.container.style.top = this.top + 'px';
        this.container.style.width = this.width + 'px';
        this.container.style.height = 'auto';//this.height + 'px';

        document.body.appendChild(this.container);

        this.init();
    }

    init() {
        this.container.appendChild(this.createTitle());
        this.container.appendChild(this.createContentContainer());
        this.contentContainer.appendChild(this.create3DContainer());
        // this.createControlDiv();
        this.createResizeElements(this.contentContainer);
    }

    get3DContainerPosition() {
        return { top: parseInt(this.container.style.top), height: parseInt(this.container.style.height), right: parseInt(this.container.style.right), width: parseInt(this.container.style.width) }
    }

    getVisibleState(): boolean {
        if (this.container.style.display.includes('none')) return false;
        else return true;
    }

    showScreen(bShow: boolean) {
        if (bShow) {
            this.container.style.display = 'block';
            this.restoreScreen();
        }
        else {
            this.container.style.display = 'none';
        }
    }

    collapseScreen() {
        if (this.contentContainer.style.display == 'block') {
            this.contentContainer.style.display = 'none';
            this.container.style.height = this.titleH + 'px';
            this.cb.src = require("assets/UI/canvas_dropdown_closed.png");
        }
        else {
            this.contentContainer.style.display = 'block';
            this.container.style.height = this.height + 'px';
            this.cb.src = require("assets/UI/canvas_dropdown.png");

            this.mol3DView.component?.stage.handleResize();
        }
    }

    createContentContainer() {
        const contentContainer = <HTMLDivElement>document.createElement('div');
        contentContainer.style.position = 'relative';
        contentContainer.style.right = '0px';
        contentContainer.style.top = this.titleH + 'px';
        contentContainer.style.width = '100%';
        contentContainer.style.height = 'calc(100% - ' + this.titleH + 'px)';
        this.contentContainer = contentContainer;
        return contentContainer;
    }
    create3DContainer() {
        const _3DContainer = <HTMLDivElement>document.createElement('div');
        _3DContainer.id = "viewport";
        _3DContainer.style.position = 'relative';
        _3DContainer.style.left = '0px';
        _3DContainer.style.top = '0px';
        _3DContainer.style.width = '0px';//'100%';
        _3DContainer.style.height = '0px';//'100%';
        return _3DContainer;
    }

    createTitle() {
        this.bMax = false;
        this.bMin = false;
        var _maxImage = document.createElement('img')
        _maxImage.style.position = 'relative';
        _maxImage.style.left = '0px';
        _maxImage.style.top = '0px';
        _maxImage.style.width = '100%';
        _maxImage.style.height = '100%';
        this.maxImage = _maxImage;

        var _minImage = document.createElement('img')
        _minImage.style.position = 'relative';
        _minImage.style.left = '0px';
        _minImage.style.top = '0px';
        _minImage.style.width = '100%';
        _minImage.style.height = '100%';
        this.minImage = _minImage;
        this.refreshMinMaxIcons();

        const _TitleBarElement = <HTMLDivElement>document.createElement('div');
        _TitleBarElement.style.position = 'absolute';
        _TitleBarElement.style.right = '0px';
        _TitleBarElement.style.top = '0px';
        _TitleBarElement.style.width = '100%';
        _TitleBarElement.style.height = this.titleH + 'px';
        _TitleBarElement.style.display = 'flex'
        _TitleBarElement.style.flexDirection = 'row'
        _TitleBarElement.style.justifyContent = 'center'
        _TitleBarElement.style.textAlign = 'center'
        _TitleBarElement.style.overflow = 'hidden';

        // const _SettingElement = <HTMLDivElement>document.createElement('div');
        // _SettingElement.style.position = 'relative';
        // _SettingElement.style.left = '0px';
        // _SettingElement.style.top = '0px';
        // _SettingElement.style.width = this.titleH + 'px';
        // _SettingElement.style.height = this.titleH + 'px';
        // _SettingElement.style.marginLeft = '4px'
        // const imageElement3 = document.createElement('img')
        // imageElement3.style.position = 'relative';
        // imageElement3.style.left = '0px';
        // imageElement3.style.top = '0px';
        // imageElement3.style.width = '100%'
        // imageElement3.style.height = '100%'
        // imageElement3.src = require("assets/UI/setting_ngl.png");
        // _SettingElement.appendChild(imageElement3);
        // _SettingElement.addEventListener('click', () => {
        //     if (this.controlDiv.style.display.includes('none')) {
        //         this.controlDiv.style.display = 'block';
        //     }
        //     else {
        //         this.controlDiv.style.display = 'none';
        //     }
        // });
        // _SettingElement.addEventListener('mouseenter', () => {
        //     imageElement3.src = require("assets/UI/setting_ngl_hover.png");
        //     // imageElement3.classList.add("myHover")
        // });
        // _SettingElement.addEventListener('mouseleave', () => {
        //     imageElement3.src = require("assets/UI/setting_ngl.png");
        // });
        // _TitleBarElement.appendChild(_SettingElement);

        const _MaxElement = <HTMLDivElement>document.createElement('div');
        _MaxElement.style.position = 'relative';
        _MaxElement.style.left = '0px';
        _MaxElement.style.top = '0px';
        _MaxElement.style.width = this.titleH + 'px';
        _MaxElement.style.height = this.titleH + 'px';
        _MaxElement.style.marginLeft = '4px'
        _MaxElement.appendChild(this.maxImage);
        _MaxElement.addEventListener('click', () => {
            this.bMin = false;
            this.bMax = !this.bMax;
            this.refreshMinMaxIcons();
            if (this.bMax) this.maximizeScreen();
            else this.restoreScreen();
        });
        _MaxElement.addEventListener('mouseenter', () => {
            if (!this.bMax) this.maxImage.src = require("assets/UI/max_hover.png");
            else this.maxImage.src = require("assets/UI/origin_hover.png");
        });
        _MaxElement.addEventListener('mouseleave', () => {
            this.refreshMinMaxIcons();
        });
        _TitleBarElement.appendChild(_MaxElement);

        const _inTitleBarElement = <HTMLDivElement>document.createElement('div');
        _inTitleBarElement.style.position = 'relative';
        _inTitleBarElement.style.left = '0px';
        _inTitleBarElement.style.top = '0px';
        _inTitleBarElement.style.width = 'calc(100% - ' + (this.titleH * 2) + 'px)';
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

        const leftImage = document.createElement('img')
        leftImage.style.position = 'relative';
        leftImage.style.left = '0px';
        leftImage.style.top = '0px';
        leftImage.style.width = '100%'
        leftImage.style.height = '100%'
        leftImage.src = require("assets/UI/canvas_title.png");
        const rightImage = document.createElement('img')
        rightImage.style.position = 'relative';
        rightImage.style.left = '0px';
        rightImage.style.top = '0px';
        rightImage.style.width = '100%'
        rightImage.style.height = '100%'
        rightImage.src = require("assets/UI/canvas_title.png");
        const txtElement = document.createElement('span');
        txtElement.textContent = "3D\u00a0STRUCTURE";
        txtElement.style.marginLeft = '2px'
        txtElement.style.marginRight = '2px'
        // _TxtElement.style.width = '100%'
        txtElement.style.height = '100%'
        // _TxtElement.style.display = 'inline-block'
        txtElement.style.textAlign = 'center'
        _inTitleBarElement.appendChild(leftImage);
        _inTitleBarElement.appendChild(txtElement);
        _inTitleBarElement.appendChild(rightImage);

        // const _MinElement = <HTMLDivElement>document.createElement('div');
        // _MinElement.style.position = 'relative';
        // _MinElement.style.left = '0px';
        // _MinElement.style.top = '0px';
        // _MinElement.style.width = this.titleH + 'px';
        // _MinElement.style.height = this.titleH + 'px';
        // _MinElement.appendChild(this.minImage);
        // _MinElement.addEventListener('click', () => {
        //     this.bMax = false;
        //     this.bMin = !this.bMin;
        //     this.refreshMinMaxIcons();
        //     if (this.bMin) this.miniScreen();
        //     else this.restoreScreen();
        // });
        // _MinElement.addEventListener('mouseenter', () => {
        //     if (this.bMin) this.minImage.src = require("assets/UI/widen_hover.png");
        //     else this.minImage.src = require("assets/UI/min_hover.png");
        // });
        // _MinElement.addEventListener('mouseleave', () => {
        //     this.refreshMinMaxIcons();
        // });
        // _TitleBarElement.appendChild(_MinElement);

        const _CloseElement = <HTMLDivElement>document.createElement('div');
        _CloseElement.style.position = 'relative';
        _CloseElement.style.width = this.titleH + 'px';
        _CloseElement.style.height = this.titleH + 'px';
        _CloseElement.style.marginLeft = '4px'
        _CloseElement.style.marginRight = '4px'
        const imageElement4 = document.createElement('img')
        imageElement4.style.position = 'relative';
        imageElement4.style.left = '0px';
        imageElement4.style.top = '0px';
        imageElement4.style.width = '100%'
        imageElement4.style.height = '100%'
        imageElement4.src = require("assets/UI/canvas_dropdown.png");
        _CloseElement.appendChild(imageElement4);
        _CloseElement.addEventListener('click', () => {
            // this.showScreen(false);
            this.collapseScreen();
        });
        _CloseElement.addEventListener('mouseenter', () => {
            if (this.contentContainer.style.display == 'block') {
                imageElement4.src = require("assets/UI/canvas_dropdown_hover.png");
            }
            else {
                imageElement4.src = require("assets/UI/canvas_dropdown_closed_hover.png");
            }
        });
        _CloseElement.addEventListener('mouseleave', () => {
            if (this.contentContainer.style.display == 'block') {
                imageElement4.src = require("assets/UI/canvas_dropdown.png");
            }
            else {
                imageElement4.src = require("assets/UI/canvas_dropdown_closed.png");
            }
        });
        _TitleBarElement.appendChild(_CloseElement);

        this.cb = imageElement4;
        this.tb = _inTitleBarElement;

        return _TitleBarElement;
    }
    refreshMinMaxIcons() {
        if (this.bMin)
            this.minImage.src = require("assets/UI/widen.png");
        else
            this.minImage.src = require("assets/UI/min.png");

        if (this.bMax)
            this.maxImage.src = require("assets/UI/origin.png");
        else
            this.maxImage.src = require("assets/UI/max.png");
    }
    createResizeElements(container: HTMLElement) {
        const _LeftBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _LeftBottomResizeElement.style.position = 'absolute';
        _LeftBottomResizeElement.style.left = '0px';
        _LeftBottomResizeElement.style.bottom = '0px';
        _LeftBottomResizeElement.style.width = this.titleH + 'px';
        _LeftBottomResizeElement.style.height = this.titleH + 'px';
        _LeftBottomResizeElement.style.touchAction = 'none'
        const imageElement1 = document.createElement('img')
        imageElement1.style.position = 'relative';
        imageElement1.style.left = '0px';
        imageElement1.style.top = '0px';
        imageElement1.style.width = '100%'
        imageElement1.style.height = '100%'
        imageElement1.src = require("assets/UI/canvas_left.png");
        _LeftBottomResizeElement.appendChild(imageElement1);
        container.appendChild(_LeftBottomResizeElement);

        const _RightBottomResizeElement = <HTMLDivElement>document.createElement('div');
        _RightBottomResizeElement.style.position = 'absolute';
        _RightBottomResizeElement.style.right = '0px';
        _RightBottomResizeElement.style.bottom = '0px';
        _RightBottomResizeElement.style.width = this.titleH + 'px';
        _RightBottomResizeElement.style.height = this.titleH + 'px';
        _RightBottomResizeElement.style.touchAction = 'none'
        const imageElement21 = document.createElement('img')
        imageElement21.style.position = 'relative';
        imageElement21.style.left = '0px';
        imageElement21.style.top = '0px';
        imageElement21.style.width = '100%'
        imageElement21.style.height = '100%'
        imageElement21.src = require("assets/UI/canvas_right.png");
        _RightBottomResizeElement.appendChild(imageElement21);
        container.appendChild(_RightBottomResizeElement);

        this.rb = _RightBottomResizeElement;
        this.lb = _LeftBottomResizeElement;

        this.setResizeHandlers();
    }

    maximizeScreen() {
        var chatWidth = 0;
        if (this.isMobile) chatWidth = 0;

        this.prevWidth = this.width;
        this.prevHeight = this.height;
        this.prevTop = this.top;
        this.prevRight = this.right;

        this.top = Mol3DUI.TOP;
        this.right = (this.margin + chatWidth);
        this.width = (document.body.clientWidth - chatWidth - this.margin * 2);
        this.height = (document.body.clientHeight - Mol3DUI.TOP - Mol3DUI.BOTTOM_H - this.margin);

        this.container.style.top = this.top + 'px';
        this.container.style.right = this.right + 'px';
        this.container.style.width = this.width + 'px';
        this.container.style.height = this.height + 'px';

        this.contentContainer.style.display = 'block';
        this.mol3DView.component?.stage.handleResize();
    }
    restoreScreen() {
        this.bMax = false;
        this.bMin = false;
        this.refreshMinMaxIcons();

        this.width = this.prevWidth;
        this.height = this.prevHeight;
        this.top = this.prevTop;
        this.right = this.prevRight;

        this.container.style.width = this.width + 'px';
        this.container.style.height = this.height + 'px';
        this.container.style.top = this.top + 'px';
        this.container.style.right = this.right + 'px';

        this.contentContainer.style.display = 'block';
        this.mol3DView.component?.stage.handleResize();
    }

    setResizeHandlers() {
        var scope = this;

        var lb = this.lb;
        var rb = this.rb;
        var tb = this.tb;

        let downElementID = 0;
        let down: boolean = false;
        let prevX: number = 0;
        let prevY: number = 0;

        function mousemove_LBListener() {
            if (scope.bMin || scope.bMax) lb.style.cursor = "default";
            else lb.style.cursor = "sw-resize";
        }
        function mousemove_RBListener() {
            if (scope.bMin || scope.bMax) rb.style.cursor = "default";
            else rb.style.cursor = "nw-resize";
        }
        function mousemove_TBListener() {
            if (scope.bMin || scope.bMax) tb.style.cursor = "default";
            else tb.style.cursor = "move";
        }
        lb.addEventListener('pointerdown', (e: PointerEvent) => {
            if (this.bMin || this.bMax) {
                if (!this.isMobile) lb.addEventListener('pointermove', mousemove_LBListener);
                return;
            }
            downElementID = 1;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) lb.removeEventListener('pointermove', mousemove_LBListener);
            capturePointerEvents();
        });
        if (!this.isMobile) lb.addEventListener('pointermove', mousemove_LBListener);

        rb.addEventListener('pointerdown', (e: PointerEvent) => {
            if (this.bMin || this.bMax) {
                if (!this.isMobile) rb.addEventListener('pointermove', mousemove_RBListener);
                return;
            }
            downElementID = 3;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) rb.removeEventListener('pointermove', mousemove_RBListener);
            capturePointerEvents();
        });
        if (!this.isMobile) rb.addEventListener('pointermove', mousemove_RBListener);

        tb.addEventListener('pointerdown', (e: PointerEvent) => {
            if (this.bMin || this.bMax) {
                if (!this.isMobile) tb.addEventListener('pointermove', mousemove_TBListener);
                return;
            }
            downElementID = 2;
            prevX = e.screenX
            prevY = e.screenY
            down = true;
            if (!this.isMobile) tb.removeEventListener('pointermove', mousemove_TBListener);
            capturePointerEvents();
        });
        if (!this.isMobile) tb.addEventListener('pointermove', mousemove_TBListener);

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
                    if (document.body.clientWidth - scope.right - scope.width < scope.margin)
                        scope.width = document.body.clientWidth - scope.right - scope.margin;
                    if (scope.height + curY - prevY >= scope.minSize)
                        scope.height += curY - prevY;
                    if (document.body.clientHeight - scope.top - scope.height < scope.margin)
                        scope.height = document.body.clientHeight - scope.top - scope.margin;

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
                    if (document.body.clientHeight - scope.top - scope.height < scope.margin)
                        scope.height = document.body.clientHeight - scope.top - scope.margin;
                    scope.container.style.width = scope.width + 'px';
                    scope.container.style.height = scope.height + 'px';
                    scope.container.style.right = scope.right + 'px';
                }
                prevX = curX;
                prevY = curY;
                scope.mol3DView.component?.stage.handleResize();
            }
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