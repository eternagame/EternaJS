import {
    autoLoad,
    Box3,
    Component,
    getFileInfo,
    MouseActions, ParserRegistry, PickingProxy, Stage, Structure, Vector2, Vector3
} from 'ngl';
import {Matrix4} from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {Assert, ContainerObject} from 'flashbang';
import {Signal, Value} from 'signals';
import Eterna from 'eterna/Eterna';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import NGLPickingUtils from './NGLPickingUtils';
import createColorScheme, {getBaseColor} from './EternaColorScheme';
import Pose3DWindow, {NGLDragState} from './Pose3DWindow';
import NGLRenderPass from './NGLRenderPass';
import createEternaRepresentation from './EternaRepresentation';
import BaseHighlightGroup from './BaseHighlightGroup';
import SparkGroup from './SparkGroup';

export default class Pose3D extends ContainerObject {
    public readonly baseClicked: Signal<number> = new Signal();
    public readonly baseHovered: Signal<number> = new Signal();
    public readonly sequence: Value<Sequence>;
    public readonly secstruct: Value<SecStruct>;
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
        this.secstruct = new Value(secstruct);
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
        this._nglDiv.style.visibility = 'hidden';
        // For some reason this is necessary for the pointer events to actually stop firing on the div
        // (which we need to ensure, otherwise our div will be over part of the canvas and the canvas)
        // won't receive the pointer events
        this._nglDiv.style.position = 'absolute';
        this._domParent.appendChild(this._nglDiv);

        // Initialize NGL
        this._stage = new Stage(this._nglDiv, {
            lightColor: 0xffffff,
            ambientColor: 0xffffff
        });

        // Initialize UI
        this._window = new Pose3DWindow(this._stage);
        this.addObject(this._window, this.container);

        // Customize initial viewer parameters
        this._stage.viewer.setFog(0x222222, undefined, 100000000);

        // Custom effects
        this.initEffects();

        // Set our custom control scheme
        this.initControls();

        // Load the 3D file
        this.loadStructure();

        this.regs.add(this.sequence.connect((oldSeq, newSeq) => this.update3DSequence(oldSeq, newSeq)));
    }

    public dispose() {
        this._stage.removeAllComponents();
        this._stage.dispose();
        this._nglDiv.remove();
        super.dispose();
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
                    this.rotateDrag(dx, dy);
                    break;
                case NGLDragState.ZOOM:
                    MouseActions.zoomDrag(stage, dx, dy);
                    break;
                default: Assert.unreachable(this._window.nglDragState);
            }
        });
        this._stage.mouseControls.add('drag-shift-left', MouseActions.panDrag);
        this._stage.mouseControls.add(
            'drag-ctrl-left',
            (_stage: Stage, dx: number, dy: number) => this.rotateDrag(dx, dy)
        );
        this._stage.mouseControls.add(
            'clickPick-left',
            (_stage: Stage, pickingProxy: PickingProxy) => this.paintPick(pickingProxy)
        );
        this._stage.mouseControls.add(
            'hoverPick',
            (_stage: Stage, pickingProxy: PickingProxy) => this.tooltipPick(pickingProxy)
        );
    }

    /**
     * Custom orbit control
     *
     * NGL's rotation controls either rotate either:
     * 1) Around the origin after the position is offset, which is liable to be confusing for many users,
     *    since you could do something like offset to the right, rotate to the back, and then you're left
     *    wondering "why is it so far away and how do I actually rotate the model"
     * 2) Rotate the component itself, which doesn't work for us since we place things like base highlights
     *    in the scene as a child of the translation group, not the component, so they'd wind up being in
     *    the wrong position
     *
     * This function instead adds a rotation to the translation group, rotating around its center
     *
     * @param x Mouse x offset
     * @param y Mouse y offset
     */
    private rotateDrag(x: number, y: number) {
        const dx = this._stage.trackballControls.rotateSpeed * -x * 0.01;
        const dy = this._stage.trackballControls.rotateSpeed * -y * 0.01;

        const box = new Box3().setFromObject(this._stage.viewer.translationGroup);
        const center = box.getCenter(new Vector3());

        const transform = new Matrix4();
        transform
            // Translate to center
            .premultiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
            // Rotate on X axis
            .premultiply(new Matrix4().makeRotationX(-dy))
            // Rotate on Y axis
            .premultiply(new Matrix4().makeRotationY(dx))
            // Translate back to original position
            .premultiply(new Matrix4().makeTranslation(center.x, center.y, center.z));

        this._stage.viewer.translationGroup.applyMatrix4(transform);

        this._stage.viewer.requestRender();
    }

    private initEffects() {
        const composer = new EffectComposer(this._stage.viewer.renderer);

        const nglRender = this._stage.viewer.render.bind(this._stage.viewer);
        const renderPass = new NGLRenderPass(nglRender);
        composer.addPass(renderPass);

        const changedBaseOutlinePass = new OutlinePass(
            new Vector2(this._window.nglWidth, this._window.nglHeight),
            this._stage.viewer.scene,
            this._stage.viewer.camera
        );
        changedBaseOutlinePass.edgeStrength = 5;
        changedBaseOutlinePass.edgeGlow = 0.5;
        changedBaseOutlinePass.edgeThickness = 2;
        composer.addPass(changedBaseOutlinePass);

        const effectFXAA = new ShaderPass(FXAAShader);
        composer.addPass(effectFXAA);

        this._baseHighlights = new BaseHighlightGroup(this._stage, changedBaseOutlinePass);
        this._baseHighlights.name = 'baseHighlightGroup';
        this._stage.viewer.translationGroup.add(this._baseHighlights);

        this._sparkGroup = new SparkGroup(this._stage);
        this._sparkGroup.name = 'sparkGroup';
        this._stage.viewer.translationGroup.add(this._sparkGroup);

        this._stage.viewer.render = (picking) => {
            // When render is called with picking, that makes NGL render to a renderTarget used for
            // hit testing, rather than actually rendering to the screen. We don't want to apply our
            // extra effects in that scenario, so just call nglRender directly.
            if (picking) {
                // We also don't want to render the base highlights while picking, or else NGL will
                // think that because the highlight is the first thing behind the cursor, that we're
                // hovering over that and not the base
                this._baseHighlights.visible = false;
                nglRender(true);
                this._baseHighlights.visible = true;
            } else {
                composer.render();
                this._window.updateNGLTexture();
            }
        };

        this.regs.add(this._window.resized.connect(() => {
            composer.setSize(this._window.nglWidth, this._window.nglHeight);
            effectFXAA.uniforms['resolution'].value.set(1 / this._window.nglWidth, 1 / this._window.nglHeight);
        }));

        this._stage.viewer.requestRender();
    }

    private loadStructure() {
        this._stage.removeAllComponents();
        this._component = null;

        this._stage.defaultFileParams = {firstModelOnly: true};
        this._stage
            .loadFile(this.structureFile)
            .then((component: void | Component) => {
                if (component) {
                    this._component = component;
                    this._colorScheme = createColorScheme(this.sequence);
                    const representationID = createEternaRepresentation(this.sequence, this.secstruct);
                    this._component.addRepresentation(representationID, {vScale: 0.5, color: this._colorScheme});
                    this._component.addRepresentation('backbone', {color: 0xff8000});
                    this._component.autoView();
                    // This forces NGL's debug bounding box mesh to be updated and its bounding sphere
                    // computed. Without doing this, rotateDrag won't actually rotate around the center
                    // of the model. Is there a better way to do this that isn't taking advantage of debug
                    // helpers?
                    this._stage.viewer.updateHelper();
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
        // We'll draw the tooltip ourselves, so hide the NGL one
        this._stage.tooltip.style.display = 'none';

        const sp = this._stage.getParameters();
        if (sp.tooltip && pickingProxy) {
            const mp = pickingProxy.mouse.position;
            const label = NGLPickingUtils.getLabel(pickingProxy, this.sequence.value, this._customNumbering);

            if (label === '') {
                this._window.tooltip.display.visible = false;
            } else {
                this._window.tooltip.setText(label);
                // This doesn't take into account the Pixi view not being at the origin. Should it?
                // I think there's other areas in the code dealing with HTML elements where we
                // similarly rely on the Pixi view being at the origin...
                const globalPos = this._window.display.getGlobalPosition();
                this._window.tooltip.display.position.set(10 + mp.x - globalPos.x, mp.y - globalPos.y);
                this._window.tooltip.display.visible = true;
            }

            const hoveredBase = NGLPickingUtils.checkForBase(pickingProxy);
            if (hoveredBase !== null) {
                this.hover3D(hoveredBase);
                this.baseHovered.emit(hoveredBase);
            } else {
                this.hover3D(-1);
            }
        } else {
            this._window.tooltip.display.visible = false;
            this.hover3D(-1);
        }
    }

    private update3DSequence(oldSeq: Sequence, newSeq: Sequence) {
        for (let i = 0; i < oldSeq.length; i++) {
            if (oldSeq.nt(i) !== newSeq.nt(i)) {
                this._baseHighlights.addChanged(i);
            }
        }
        this._baseHighlights.updateHoverColor((baseIndex) => getBaseColor(this.sequence.value.nt(baseIndex)));
        this._component?.updateRepresentations({color: this._colorScheme});
        this._stage.viewer.requestRender();
    }

    public hover3D(index: number) {
        if (index !== -1) {
            const color: number = getBaseColor(this.sequence.value.nt(index));
            this._baseHighlights.switchHover(index, color);
        } else {
            this._baseHighlights.clearHover();
        }
    }

    public mark3D(index: number) {
        this._baseHighlights.toggleMark(index);
    }

    public spark3D(indices: number[]) {
        this._sparkGroup.spark(indices);
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
    private _domParent: HTMLElement;

    private _nglDiv: HTMLElement;
    private _stage: Stage;
    private _component: Component | null;
    private _colorScheme: string;
    private _baseHighlights: BaseHighlightGroup;
    private _sparkGroup: SparkGroup;

    private _window: Pose3DWindow;
}
