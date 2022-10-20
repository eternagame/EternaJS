import Folder from 'eterna/folding/Folder';
import {
    ContainerObject, HAlign, HLayoutContainer, LayoutContainer, SceneObject, VLayoutContainer
} from 'flashbang';
import {Container} from 'pixi.js';
import FolderSwitcher from './FolderSwitcher';
import GameWindow from './GameWindow';
import MarkerSwitcher from './MarkerSwitcher';
import StateToggle from './StateToggle';
import ToolbarButton from './toolbar/ToolbarButton';
import {
    baseColorButtonProps, estimateButtonProps, expColorButtonProps, naturalButtonProps, targetButtonProps
} from './toolbar/ToolbarButtons';

export default class ModeBar extends ContainerObject {
    public added() {
        // We're not really a window, but handy to handle scrolling and background
        this._window = new GameWindow({
            movable: false,
            // Parent will be responsible for this since we also eg don't want to overlap the toolbar
            ensureOnScreen: false,
            bgColor: 0x09162C,
            bgAlpha: 0.8,
            verticalContentMargin: 12,
            horizontalContentMargin: 12
        });
        this.addObject(this._window, this.container);
        this._vLayout = new VLayoutContainer(10, HAlign.LEFT);
        this._window.content.addChild(this._vLayout);
        // If there's nothing there, don't show it
        this._window.display.visible = false;
    }

    public addStructToggle(type: 'solve' | 'feedback'): {actualButton: ToolbarButton, targetButton: ToolbarButton} {
        const hLayout = new HLayoutContainer();
        this._vLayout.addChild(hLayout);
        return {
            actualButton: this.addItem(
                ToolbarButton.createButton(type === 'solve' ? naturalButtonProps : estimateButtonProps),
                hLayout
            ),
            targetButton: this.addItem(ToolbarButton.createButton(targetButtonProps), hLayout)
        };
    }

    public addColorToggle(): {baseButton: ToolbarButton, expButton: ToolbarButton} {
        const hLayout = new HLayoutContainer();
        this._vLayout.addChild(hLayout);
        return {
            baseButton: this.addItem(ToolbarButton.createButton(baseColorButtonProps), hLayout),
            expButton: this.addItem(ToolbarButton.createButton(expColorButtonProps), hLayout)
        };
    }

    public addStateToggle(states: number): StateToggle {
        return this.addItem(new StateToggle(states));
    }

    public addFolderSwitcher(
        canUseFolder: ((folder: Folder) => boolean) | undefined,
        defaultFolder?: Folder | undefined,
        allowChange?: boolean
    ): FolderSwitcher {
        return this.addItem(new FolderSwitcher(canUseFolder, defaultFolder, allowChange));
    }

    public addMarkerSwitcher(): MarkerSwitcher {
        return this.addItem(new MarkerSwitcher());
    }

    private addItem<T extends SceneObject>(toAdd: T, parent?: Container): T {
        if (!this.isLiveObject) {
            throw new Error('Attempted to add ModeBar item before ModeBar is added');
        }

        this.addObject(toAdd, parent ?? this._vLayout);

        this.layout();

        return toAdd;
    }

    public set maxHeight(val: number) {
        this._window.setTargetBounds({maxHeight: val});
    }

    /** When items are added or visibility is changed */
    public layout() {
        // This nasty bit of code ensures that if rscript has hidden both the target and natural
        // mode buttons, the hlayoutcontainer containing them doesn't still take up vertical space.
        // TODO: There's probably a better way to manage this.
        // Theoretically displayobjects shouldn't have bounds if they're not visible, so I'm
        // suspicious that there's some other lower-level issue here, but I haven't been able to figure
        // out what's going on there. I tracked it down to DisplayUtil.getBoundsRelative's call to
        // DisplayObject.getLocalBounds not overriding the contents of the passed-in bounds, but even
        // patching around that meant we have an extra vOffset because the VLayoutContainer still adds
        // a per-item offset since the child is visible, even though it's "empty". Changing that
        // behavior seemed ill-advised without deeply thinking through the repercussions...
        for (const child of this._vLayout.children) {
            if (child instanceof HLayoutContainer) {
                child.visible = child.children.some((layoutChild) => layoutChild.visible);
            }
        }

        this._vLayout.layout(true);
        this._window.layout();
        this._window.display.visible = true;
        this._window.display.visible = this._vLayout.children.some((child) => {
            if (child instanceof LayoutContainer) {
                return child.children.some((layoutChild) => layoutChild.worldVisible);
            }
            return child.worldVisible;
        });
    }

    private _window: GameWindow;
    private _vLayout: VLayoutContainer;
}
