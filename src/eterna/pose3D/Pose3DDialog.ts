import Sequence from 'eterna/rnatypes/Sequence';
import SecStruct from 'eterna/rnatypes/SecStruct';
import WindowDialog from 'eterna/ui/WindowDialog';
import {Signal, Value} from 'signals';
import {RNABase, RNAPaint} from 'eterna/EPars';
import {Assert, Flashbang, SpriteObject} from 'flashbang';
import {
    autoLoad,
    Box3,
    Component, getFileInfo, Matrix4, MouseActions, ParserRegistry, PickingProxy, Stage, Structure, Vector2, Vector3
} from 'ngl';
import {Sprite} from 'pixi.js';
import TextBalloon from 'eterna/ui/TextBalloon';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import Eterna from 'eterna/Eterna';
import GameDropdown from 'eterna/ui/GameDropdown';
import Bitmaps from 'eterna/resources/Bitmaps';
import PointerEventPropagator from './PointerEventPropagator';
import BaseHighlightGroup from './BaseHighlightGroup';
import NGLRenderPass from './NGLRenderPass';
import SparkGroup from './SparkGroup';
import NGLPickingUtils from './NGLPickingUtils';
import createColorScheme, {getBaseColor} from './EternaColorScheme';
import createEternaRepresentation from './EternaRepresentation';

enum NGLDragState {
    PAN,
    ROTATE,
    ZOOM
}

export default class Pose3DDialog extends WindowDialog<void> {
    public readonly baseClicked: Signal<number> = new Signal();
    public readonly baseHovered: Signal<number> = new Signal();
    public readonly sequence: Value<Sequence>;
    public readonly secstruct: Value<SecStruct>;
    public readonly structureFile: string | File;
    public currentColor: RNABase | RNAPaint = RNABase.ADENINE;

    constructor(
        structureFile: string | File,
        sequence: Sequence,
        secstruct: SecStruct,
        customNumbering: (number | null)[] | undefined
    ) {
        super({
            title: '3D Structure',
            horizontalContentMargin: 0,
            verticalContentMargin: 0,
            windowBgColor: 0x022347,
            windowBgAlpha: 0.6
        });

        this.structureFile = structureFile;
        this.secstruct = new Value(secstruct);
        this.sequence = new Value(sequence);
        this._customNumbering = customNumbering;
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

        // This can't be a child of the scrollcontainer, as that breaks the correct behavior of
        // pointer event propagation when eg you start dragging the model inside the window and release
        // your pointer outside the window
        const elem = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(elem, 'Could not find parent element for 3D view');
        elem.appendChild(this._nglDiv);

        // Initialize NGL
        this._nglStage = new Stage(this._nglDiv, {
            lightColor: 0xffffff,
            ambientColor: 0xffffff
        });

        this._nglSprite = new SpriteObject(Sprite.from(this._nglStage.viewer.renderer.domElement));
        this.addObject(this._nglSprite, this._window.content);

        const eventPropagator = new PointerEventPropagator(this._nglSprite, this._nglStage.viewer.renderer.domElement);
        this.addObject(eventPropagator);

        this._tooltip = new TextBalloon('', 0x0, 1);
        this._tooltip.display.visible = false;
        this.addObject(this._tooltip, this._window.content);

        const dropdown = new GameDropdown({
            fontSize: 12,
            options: ['Rotate', 'Pan', 'Zoom'],
            defaultOption: 'Rotate',
            icons: [
                {txt: 'Rotate', icon: Bitmaps.Img3DRotateIcon},
                {txt: 'Pan', icon: Bitmaps.Img3DMoveIcon},
                {txt: 'Zoom', icon: Bitmaps.ImgMingZoomIn}
            ],
            borderWidth: 0,
            height: 20,
            color: 0x043468,
            textColor: 0xFFFFFF,
            dropShadow: true
        });
        dropdown.display.position.set(10, 10);
        this.addObject(dropdown, this._window.content);
        dropdown.selectedOption.connect((val) => {
            if (val === 'Pan') {
                this._nglDragState = NGLDragState.PAN;
            } else if (val === 'Rotate') {
                this._nglDragState = NGLDragState.ROTATE;
            } else if (val === 'Zoom') {
                this._nglDragState = NGLDragState.ZOOM;
            }
        });

        // Customize initial viewer parameters
        this._nglStage.viewer.setFog(0x222222, undefined, 100000000);

        // Custom effects
        this.initEffects();

        // Set our custom control scheme
        this.initControls();

        // Load the 3D file
        this.loadStructure();

        this.regs.add(this.sequence.connect((oldSeq, newSeq) => this.update3DSequence(oldSeq, newSeq)));

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._window.contentSizeWillUpdate.connect(({width, height}) => {
            this.layout(width, height);
        });
        this._window.contentPositionUpdated.connect(({x, y}) => {
            // Position the canvas so that when we fire events, NGL can interpret the positions correctly
            this._nglStage.viewer.wrapper.style.left = `${x}px`;
            this._nglStage.viewer.wrapper.style.top = `${y}px`;
        });
        this._window.setTargetBounds({
            width: 460,
            height: 300,
            x: {
                from: 'right',
                offsetExact: 10
            },
            y: {
                from: 'top',
                offsetExact: 100
            }
        });

        Assert.assertIsDefined(this.mode);
    }

    private initEffects() {
        this._composer = new EffectComposer(this._nglStage.viewer.renderer);

        const nglRender = this._nglStage.viewer.render.bind(this._nglStage.viewer);
        const renderPass = new NGLRenderPass(nglRender);
        this._composer.addPass(renderPass);

        const changedBaseOutlinePass = new OutlinePass(
            new Vector2(1, 1),
            this._nglStage.viewer.scene,
            this._nglStage.viewer.camera
        );
        changedBaseOutlinePass.edgeStrength = 5;
        changedBaseOutlinePass.edgeGlow = 0.5;
        changedBaseOutlinePass.edgeThickness = 2;
        this._composer.addPass(changedBaseOutlinePass);

        this._effectFXAA = new ShaderPass(FXAAShader);
        this._composer.addPass(this._effectFXAA);

        this._baseHighlights = new BaseHighlightGroup(this._nglStage, changedBaseOutlinePass);
        this._baseHighlights.name = 'baseHighlightGroup';
        this._nglStage.viewer.translationGroup.add(this._baseHighlights);

        this._sparkGroup = new SparkGroup(this._nglStage);
        this._sparkGroup.name = 'sparkGroup';
        this._nglStage.viewer.translationGroup.add(this._sparkGroup);

        this._nglStage.viewer.render = (picking) => {
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
                this._composer.render();

                // We've removed the 3D view, but NGL hasn't been fully destroyed yet
                if (!this._nglSprite.display.texture) return;
                this._nglSprite.display.texture.update();
            }
        };
    }

    private initControls() {
        this._nglStage.mouseControls.clear();
        this._nglStage.mouseControls.add('scroll', MouseActions.zoomScroll);
        this._nglStage.mouseControls.add('drag-left', (stage, dx, dy) => {
            switch (this._nglDragState) {
                case NGLDragState.PAN:
                    MouseActions.panDrag(stage, dx, dy);
                    break;
                case NGLDragState.ROTATE:
                    this.rotateDrag(dx, dy);
                    break;
                case NGLDragState.ZOOM:
                    MouseActions.zoomDrag(stage, dx, dy);
                    break;
                default: Assert.unreachable(this._nglDragState);
            }
        });
        this._nglStage.mouseControls.add('drag-shift-left', MouseActions.panDrag);
        this._nglStage.mouseControls.add(
            'drag-ctrl-left',
            (_stage: Stage, dx: number, dy: number) => this.rotateDrag(dx, dy)
        );
        this._nglStage.mouseControls.add(
            'drag-meta-left',
            (_stage: Stage, dx: number, dy: number) => this.rotateDrag(dx, dy)
        );
        this._nglStage.mouseControls.add(
            'clickPick-left',
            (_stage: Stage, pickingProxy: PickingProxy) => this.paintPick(pickingProxy)
        );
        this._nglStage.mouseControls.add(
            'hoverPick',
            (_stage: Stage, pickingProxy: PickingProxy) => this.tooltipPick(pickingProxy)
        );
    }

    private loadStructure() {
        this._nglStage.removeAllComponents();
        this._component = null;

        this._nglStage.defaultFileParams = {firstModelOnly: true};
        this._nglStage
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
                    this._nglStage.viewer.updateHelper();
                }
            });
    }

    protected dispose() {
        this._nglStage.removeAllComponents();
        this._nglStage.dispose();
        this._nglDiv.remove();
        super.dispose();
    }

    private layout(width: number, height: number) {
        this._nglStage.setSize(
            `${width}px`,
            `${height}px`
        );
        this._composer.setSize(width, height);
        this._effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
        this._nglStage.viewer.render(false);

        this._nglSprite.display.width = width;
        this._nglSprite.display.height = height;
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
        const dx = this._nglStage.trackballControls.rotateSpeed * -x * 0.01;
        const dy = this._nglStage.trackballControls.rotateSpeed * -y * 0.01;

        const box = new Box3().setFromObject(this._nglStage.viewer.translationGroup);
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

        this._nglStage.viewer.translationGroup.applyMatrix4(transform);

        this._nglStage.viewer.requestRender();
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
        this._nglStage.tooltip.style.display = 'none';

        const sp = this._nglStage.getParameters();
        if (sp.tooltip && pickingProxy) {
            const mp = pickingProxy.mouse.position;
            const label = NGLPickingUtils.getLabel(pickingProxy, this.sequence.value, this._customNumbering);

            if (label === '') {
                this._tooltip.display.visible = false;
            } else {
                this._tooltip.setText(label);
                // This doesn't take into account the Pixi view not being at the origin. Should it?
                // I think there's other areas in the code dealing with HTML elements where we
                // similarly rely on the Pixi view being at the origin...
                const globalPos = this._window.display.getGlobalPosition();
                this._tooltip.display.position.set(10 + mp.x - globalPos.x, mp.y - globalPos.y);
                this._tooltip.display.visible = true;
            }

            const hoveredBase = NGLPickingUtils.checkForBase(pickingProxy);
            if (hoveredBase !== null) {
                this.hover3D(hoveredBase);
                this.baseHovered.emit(hoveredBase);
            } else {
                this.hover3D(-1);
            }
        } else {
            this._tooltip.display.visible = false;
            this.hover3D(-1);
        }
    }

    public hover3D(index: number) {
        if (index !== -1) {
            const color: number = getBaseColor(this.currentColor);
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

    private update3DSequence(oldSeq: Sequence, newSeq: Sequence) {
        for (let i = 0; i < oldSeq.length; i++) {
            if (oldSeq.nt(i) !== newSeq.nt(i)) {
                this._baseHighlights.addChanged(i);
            }
        }
        this._baseHighlights.updateHoverColor((baseIndex) => getBaseColor(this.sequence.value.nt(baseIndex)));
        this._component?.updateRepresentations({color: this._colorScheme});
        this._nglStage.viewer.requestRender();
    }

    /**
     * Checks if model file is valid
     *
     * @param structureFile File or path to file to load and check
     * @param expectedLength Expected number of nucleotides in the structure
     */
    public static async checkModelFile(structureFile: string | File, expectedLength: number) {
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

    private _nglDragState: NGLDragState = NGLDragState.ROTATE;

    private _nglDiv: HTMLElement;
    private _nglStage: Stage;
    private _nglSprite: SpriteObject;
    private _tooltip: TextBalloon;

    private _component: Component | null;
    private _colorScheme: string;
    private _composer: EffectComposer;
    private _effectFXAA: ShaderPass;
    private _baseHighlights: BaseHighlightGroup;
    private _sparkGroup: SparkGroup;
}
