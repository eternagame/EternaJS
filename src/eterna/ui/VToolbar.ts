// kkk VToolBar.ts --- side tool bar for 3d View
import {
    ContainerObject, Flashbang, VLayoutContainer,
    HAlign, Assert
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from './GameButton';
import {ToolbarButton} from './Toolbar';

export default class VToolBar extends ContainerObject {
    side3DToolbarLayout: VLayoutContainer;
    show3D: GameButton;
    zoomin3D: GameButton;
    zoomout3D: GameButton;
    move3D: GameButton;
    rotate3D: GameButton;

    protected added(): void {
        super.added();
        this.create3DButtons();
    }

    create3DButtons() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        const APPROX_ITEM_COUNT = 13;
        const APPROX_ITEM_HEIGHT = 52;
        // For some reason there's a 2px margin on either side of our UI elements baked in... because.
        const APPROX_ITEM_WIDTH = APPROX_ITEM_HEIGHT + (2 * 2);
        Assert.assertIsDefined(Flashbang.stageWidth);
        const SPACE_WIDE = Math.min((Flashbang.stageWidth / APPROX_ITEM_COUNT) - APPROX_ITEM_WIDTH, 13);
        const SPACE_NARROW = SPACE_WIDE * 0.28;

        this.side3DToolbarLayout = new VLayoutContainer(SPACE_NARROW, HAlign.CENTER);
        this.move3D = new ToolbarButton()
            .up(Bitmaps.Img3DMove)
            .over(Bitmaps.Img3DMove)
            .down(Bitmaps.Img3DMove)
            .tooltip('Move');
        this.move3D.toggled.value = false;
        this.addObject(this.move3D, this.side3DToolbarLayout);
        this.rotate3D = new ToolbarButton()
            .up(Bitmaps.Img3DRotate)
            .over(Bitmaps.Img3DRotate)
            .down(Bitmaps.Img3DRotate)
            .tooltip('Rotate');
        this.rotate3D.toggled.value = true;
        this.addObject(this.rotate3D, this.side3DToolbarLayout);
        this.side3DToolbarLayout.addVSpacer(SPACE_NARROW);
        this.show3D = new GameButton()
            .up(Bitmaps.Img3DHide)
            .over(Bitmaps.Img3DHide)
            .down(Bitmaps.Img3DHide)
            .tooltip('Hide');
        this.addObject(this.show3D, this.side3DToolbarLayout);
        this.side3DToolbarLayout.addVSpacer(SPACE_NARROW);
        this.zoomin3D = new GameButton()
            .up(Bitmaps.Img3DZoomin)
            .over(Bitmaps.Img3DZoomin)
            .down(Bitmaps.Img3DZoomin)
            .tooltip('Zoom in');
        this.addObject(this.zoomin3D, this.side3DToolbarLayout);
        this.zoomout3D = new GameButton()
            .up(Bitmaps.Img3DZoomout)
            .over(Bitmaps.Img3DZoomout)
            .down(Bitmaps.Img3DZoomout)
            .tooltip('Zoom out');
        this.addObject(this.zoomout3D, this.side3DToolbarLayout);

        this.container.addChild(this.side3DToolbarLayout);
        this.updateLayout();
    }

    public onResized() {
        this.updateLayout();
    }

    private updateLayout(): void {
        this.side3DToolbarLayout.layout(true);
    }
}
