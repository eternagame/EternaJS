import { Container } from "pixi.js";
import Mol3DView from "../PoseEdit/Mol3DView";

const events = [
    'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove',
    'pointerout', 'pointerover', 'pointerup', 'mousedown', 'mouseenter', 'mouseleave',
    'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousedown', 'mouseup'
] as const;

let earlyHandlers: ((e: MouseEvent | PointerEvent) => void)[] = [];

for (const event of events) {
    window.addEventListener(event, (e) => {
        earlyHandlers.forEach((handler) => handler(e));
    }, true);
}

// Same deal but for touch events
const touchEvents = ['touchstart', 'touchcancel', 'touchend', 'touchmove'] as const;

let earlyTouchHandlers: ((e: TouchEvent) => void)[] = [];

for (const event of touchEvents) {
    window.addEventListener(event, (e) => {
        earlyTouchHandlers.forEach((handler) => handler(e));
    }, true);
}

export default class MyContainer extends Container {
    constructor() {
        super();
        this._boundHME = this.handlePossiblyMaskedEvent.bind(this);
        this._boundHTE = this.handleTouchEvent.bind(this);
        earlyHandlers.push(this._boundHME);
        earlyTouchHandlers.push(this._boundHTE);
    }
    private handlePossiblyMaskedEvent(e: MouseEvent | PointerEvent): void {
        if(Mol3DView.scope !== undefined && Mol3DView.scope.getVisibleState() && e instanceof MouseEvent) {
            var pos = Mol3DView.scope.getPosition();
            var init:MouseEventInit = {
                cancelable: true,
                bubbles: true,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX - pos.x,
                clientY: e.clientY - pos.y,
                movementX: e.movementX,
                movementY: e.movementY,
                screenX: e.screenX,
                screenY: e.screenY,
            }
            if(Mol3DView.scope.metaState) {
                init.ctrlKey = true;
            }
            const myEvent = new MouseEvent(e.type, init);//new MouseEvent(e.type, e);
            Mol3DView.scope.isOver3DCanvas = Mol3DView.scope.PtInCanvas(e.clientX - pos.x, e.clientY - pos.y);
            if(Mol3DView.scope.isOver3DCanvas) 
                Mol3DView.scope.stage.viewer.getWebGLCanvas().dispatchEvent(myEvent);

        }
    }

    private handleTouchEvent(e: TouchEvent): void {
        if(Mol3DView.scope !== undefined && Mol3DView.scope.getVisibleState()) {
            var pos = Mol3DView.scope.getPosition();
            if (e.touches.length > 0) {
                var touchObjArray = [];
                var x = e.touches[0].clientX - pos.x;
                var y = e.touches[0].clientY - pos.y;
                for(var i=0;i<e.touches.length;i++) {
                    touchObjArray.push(new Touch({
                        identifier: Date.now(),
                        target: Mol3DView.scope.stage.viewer.getWebGLCanvas(),
                        clientX: e.touches[i].clientX - pos.x,
                        clientY: e.touches[i].clientY - pos.y,
                        screenX: e.touches[i].screenX,
                        screenY: e.touches[i].screenY,
                        pageX: e.touches[i].pageX - pos.x,
                        pageY: e.touches[i].pageY - pos.y,
                        radiusX: e.touches[i].radiusX,
                        radiusY: e.touches[i].radiusY,
                        rotationAngle: e.touches[i].rotationAngle,
                        force: e.touches[i].force,
                      }));
                }
                var init:TouchEventInit = {
                    cancelable: true,
                    bubbles: true,
                    touches: touchObjArray,
                    targetTouches: [],
                    changedTouches: touchObjArray,
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                }
                if(Mol3DView.scope.metaState) {
                    init.ctrlKey = true;
                }
                const touchEvent = new TouchEvent(e.type, init);
                Mol3DView.scope.isOver3DCanvas = Mol3DView.scope.PtInCanvas(x, y);
                if(Mol3DView.scope.isOver3DCanvas) 
                    Mol3DView.scope.stage.viewer.getWebGLCanvas().dispatchEvent(touchEvent);
            }
        }
    }
    private _boundHTE: (e: TouchEvent) => void;
    private _boundHME: (e: MouseEvent | PointerEvent) => void;
}