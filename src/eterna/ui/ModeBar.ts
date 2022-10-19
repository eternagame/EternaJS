import Folder from 'eterna/folding/Folder';
import {
    ContainerObject, HAlign, HLayoutContainer, SceneObject, VLayoutContainer
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
        this._vLayout.layout(true);
        this._window.layout();
    }

    private _window: GameWindow;
    private _vLayout: VLayoutContainer;
}
