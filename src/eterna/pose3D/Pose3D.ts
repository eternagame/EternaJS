import {
    autoLoad,
    Component,
    getFileInfo,
    MouseActions, ParserRegistry, PickingProxy, StageEx, Structure, ViewerEx
} from 'ngl';
import {Assert, ContainerObject} from 'flashbang';
import {Signal, Value} from 'signals';
import Eterna from 'eterna/Eterna';
import {RNABase} from 'eterna/EPars';
import Bitmaps from 'eterna/resources/Bitmaps';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import NGLPickingUtils from './NGLPickingUtils';
import createColorScheme, {getBaseColor} from './NGLColorScheme';
import Pose3DWindow, {NGLDragState} from './Pose3DWindow';

export default class Pose3D extends ContainerObject {
    public readonly baseClicked: Signal<number> = new Signal();
    public readonly baseHovered: Signal<number> = new Signal();
    public readonly sequence: Value<Sequence>;
    public readonly structureFile: string | File | Blob;

    constructor(
        structureFile: string | File | Blob,
        sequence: Sequence,
        secstruct: SecStruct,
        customNumbering: (number | null)[] | undefined,
        domParent?: string | HTMLElement
    ) {
        super();
        this.structureFile = structureFile;
        this._secStruct = secstruct;
        this.sequence = new Value(sequence);
        this._customNumbering = customNumbering;

        if (domParent instanceof HTMLElement) {
            this._domParent = domParent;
        } else {
            const elem = document.getElementById(domParent ?? Eterna.OVERLAY_DIV_ID);
            Assert.assertIsDefined(elem, 'Could not find parent element for 3D view');
            this._domParent = elem;
        }
    }

    protected added() {
        super.added();

        // NGL's setSize method changes the element we pass in, not just the canvas, so we need to
        // create a wrapper div for it instead of just passing the dom parent directly.
        this._nglDiv = document.createElement('div');
        this._nglDiv.style.pointerEvents = 'none';
        // For some reason this is necessary for the pointer events to actually stop firing on the div
        // (which we need to ensure, otherwise our div will be over part of the canvas and the canvas)
        // won't receive the pointer events
        this._nglDiv.style.position = 'absolute';
        this._domParent.appendChild(this._nglDiv);

        // Initialize NGL
        this._stage = new StageEx(this._nglDiv);

        // Initialize UI
        this._window = new Pose3DWindow(this._stage);
        this.addObject(this._window, this.container);

        // Set our custom control scheme
        this.initControls();

        // Load the 3D file
        this.loadStructure();

        this.regs.add(this.sequence.connect((oldSeq, newSeq) => this.update3DSequence(oldSeq, newSeq)));
    }

    public dispose() {
        this._stage.dispose();
        this._nglDiv.remove();
    }

    private initControls() {
        this._stage.mouseControls.clear();
        this._stage.mouseControls.add('scroll', MouseActions.zoomScroll);
        this._stage.mouseControls.add('drag-left', (stage, dx, dy) => {
            switch (this._window.nglDragState) {
                case NGLDragState.PAN:
                    MouseActions.panDrag(stage, dx, dy);
                    break;
                case NGLDragState.ROTATE:
                    MouseActions.rotateDrag(stage, dx, dy);
                    break;
                case NGLDragState.ZOOM:
                    MouseActions.zoomDrag(stage, dx, dy);
                    break;
                default: Assert.unreachable(this._window.nglDragState);
            }
        });
        this._stage.mouseControls.add('drag-alt-left', MouseActions.panDrag);
        this._stage.mouseControls.add('drag-ctrl-left', MouseActions.rotateDrag);
        this._stage.mouseControls.add('drag-shift-left', MouseActions.zoomDrag);
        this._stage.mouseControls.add(
            'clickPick-left',
            (_stage: StageEx, pickingProxy: PickingProxy) => this.paintPick(pickingProxy)
        );
        this._stage.mouseControls.add(
            'hoverPick',
            (_stage: StageEx, pickingProxy: PickingProxy) => this.tooltipPick(pickingProxy)
        );
    }

    private loadStructure() {
        this._stage.removeAllComponents();
        this._component = null;

        const pairs = this._secStruct.pairs;

        this._stage.defaultFileParams = {firstModelOnly: true};
        this._stage
            .loadFile(this.structureFile, {}, pairs)
            .then((component: void | Component) => {
                if (component) {
                    this._component = component;
                    this._colorScheme = createColorScheme(this.sequence);
                    this._component.addRepresentation('ebase', {vScale: 0.5, color: this._colorScheme});
                    this._component.addRepresentation('backbone', {color: 0xff8000});
                    this._component.autoView();
                    const viewer = this._stage.viewer as ViewerEx;
                    viewer.spark.setURL(Bitmaps.BonusSymbol);
                    viewer.setHBondColor([0xffffff, 0x8f9dc0, 0x546986, 0xffffff]);
                }
            });
    }

    private paintPick(pickingProxy: PickingProxy) {
        if (pickingProxy) {
            const clickedBase = NGLPickingUtils.checkForBase(pickingProxy);
            if (clickedBase !== null) {
                this.baseClicked.emit(clickedBase);
            }
        }
    }

    private tooltipPick(pickingProxy: PickingProxy) {
        const viewer = this._stage.viewer as ViewerEx;

        // We'll draw the tooltip ourselves, so hide the NGL one
        this._stage.tooltip.style.display = 'none';

        const sp = this._stage.getParameters();
        if (sp.tooltip && pickingProxy) {
            const mp = pickingProxy.mouse.position;
            const label = NGLPickingUtils.getLabel(pickingProxy, this._customNumbering);

            if (label === '') {
                this._window.tooltip.display.visible = false;
            } else {
                this._window.tooltip.setText(label);
                this._window.tooltip.display.position.set(10 + mp.x, mp.y);
                this._window.tooltip.display.visible = true;
            }

            const clickedBase = NGLPickingUtils.checkForBase(pickingProxy);
            if (clickedBase !== null) {
                viewer.hoverEBaseObject(clickedBase - 1, true, 0xFFFF00);
                this.baseHovered.emit(clickedBase);
            } else {
                viewer.hoverEBaseObject(-1);
            }
        } else {
            this._window.tooltip.display.visible = false;
            viewer.hoverEBaseObject(-1);
        }
    }

    private update3DSequence(oldSeq: Sequence, newSeq: Sequence) {
        for (let i = 0; i < oldSeq.length; i++) {
            if (oldSeq.nt(i) !== newSeq.nt(i)) {
                (this._stage.viewer as ViewerEx).selectEBaseObject(i);
            }
        }
        this._component?.updateRepresentations({color: this._colorScheme});
        this._stage.viewer.requestRender();
    }

    public hover3D(index: number, base: RNABase) {
        const color: number = getBaseColor(base);
        (this._stage.viewer as ViewerEx).hoverEBaseObject(index - 1, false, color);
    }

    public mark3D(index: number) {
        (this._stage.viewer as ViewerEx).markEBaseObject(index);
    }

    public spark3D(indices: number[]) {
        (this._stage.viewer as ViewerEx).beginSpark();
        for (const index of indices) {
            (this._stage.viewer as ViewerEx).addSpark(index + 1);
        }
        (this._stage.viewer as ViewerEx).endSpark(20);
    }

    /**
     * Checks if model file is valid
     *
     * @param structureFile File or path to file to load and check
     * @param expectedLength Expected number of nucleotides in the structure
     */
    public static async checkModelFile(structureFile: string | File | Blob, expectedLength: number) {
        const ext = getFileInfo(structureFile).ext;

        if (ParserRegistry.isTrajectory(ext)) {
            throw new Error(`loadFile: ext '${ext}' is a trajectory and must be loaded into a structure component`);
        }

        const object = await autoLoad(structureFile);

        if (object instanceof Structure) {
            const residueCount = object.chainStore.residueCount[0];
            if (residueCount !== expectedLength) throw new Error('3D and 2D structures have different lengths.');
        } else {
            throw new Error('Loaded 3D object is not a valid structure');
        }
    }

    private _customNumbering: (number | null)[] | undefined;
    private _secStruct: SecStruct;
    private _domParent: HTMLElement;

    private _nglDiv: HTMLElement;
    private _stage: StageEx;
    private _component: Component | null;
    private _colorScheme: string;

    private _window: Pose3DWindow;
}
