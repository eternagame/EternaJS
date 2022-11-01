import {ContainerObject, DisplayUtil, HLayoutContainer} from 'flashbang';
import {
    Graphics, InteractionEvent, Point, Rectangle
} from 'pixi.js';
import {ToolTipPositioner} from '../help/HelpToolTip';
import Tooltips from '../Tooltips';
import ToolbarButton, {BUTTON_HEIGHT, BUTTON_WIDTH} from './ToolbarButton';

const BAY_BACKGROUND_COLOR = 0x043468;

export default class HotbarBay extends ContainerObject {
    constructor(hideFrom: 'left' | 'right', activatedTools: string[]) {
        super();
        this._hideFrom = hideFrom;
        this._activatedTools = activatedTools;
    }

    protected added() {
        this._background = new Graphics();
        this.container.addChild(this._background);

        // Hover stuff
        this._hoverSwapIndicator = new Graphics()
            .beginFill(0xc0c0c0, 0.4)
            .drawRoundedRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 7)
            .endFill();
        this.container.addChild(this._hoverSwapIndicator);
        this._hoverSwapIndicator.visible = false;
        this._hoverInsertIndicator = new Graphics()
            .beginFill(0xc0c0c0)
            .drawRect(0, 2, 2, BUTTON_HEIGHT - 4)
            .endFill();
        this.container.addChild(this._hoverInsertIndicator);
        this._hoverInsertIndicator.visible = false;

        this._content = new HLayoutContainer();
        this.container.addChild(this._content);

        this.updateButtons();
    }

    /** Show activated buttons that fit in our target width and redraw background */
    private layout() {
        if (!this.isLiveObject) return;

        let buttonsThatFit = this._targetWidth ? Math.floor(this._targetWidth / BUTTON_WIDTH) : 0;
        const buttons = this._hideFrom === 'right' ? this._availableButtons : this._availableButtons.reverse();
        for (const button of buttons) {
            if (buttonsThatFit > 0) {
                button.display.visible = true;
                buttonsThatFit--;
            } else {
                button.display.visible = false;
            }
        }
        this._content.layout(true);
        this.drawBackground();
    }

    /** Ensure all available buttons are added to this object in the correct order */
    private updateButtons() {
        this._content.removeChildren();
        for (const button of this._availableButtons) {
            this._content.addChild(button.display);
        }
        this.layout();
    }

    private drawBackground() {
        if (this._editable) {
            this._background
                .clear()
                .lineStyle(1, 0x3397db, 1)
                .beginFill(BAY_BACKGROUND_COLOR, 1)
                .drawRoundedRect(
                    -1,
                    -1,
                    Math.max(this._content.width, BUTTON_WIDTH) + 2,
                    Math.max(this._content.height, BUTTON_HEIGHT) + 2,
                    7
                )
                .endFill();
        } else {
            this._background
                .clear()
                .beginFill(BAY_BACKGROUND_COLOR, 1)
                .drawRoundedRect(
                    0,
                    0,
                    Math.max(this._content.width, BUTTON_WIDTH),
                    Math.max(this._content.height, BUTTON_HEIGHT),
                    7
                )
                .endFill();
        }
    }

    /** Make button instance available for use in the hotbar */
    public registerButton(button: ToolbarButton) {
        this._buttons.push(button);
        this.addObject(button);
        this.updateButtons();
    }

    public getButton(toolId: string): ToolbarButton | undefined {
        return this._visibleButtons.find((button) => button.id === toolId);
    }

    /** Update indicators that appear when hovering a dragged button over the hotbar  */
    public updateHoverIndicator(e: InteractionEvent, existsInHotbar: boolean) {
        this._hoverSwapIndicator.visible = false;
        this._hoverInsertIndicator.visible = false;
        Tooltips.instance?.removeTooltip(this);

        const action = this.getHoverAction(e);
        if (!action) return;

        if (action.action === 'insert') {
            this._hoverInsertIndicator.visible = true;
            this._hoverInsertIndicator.x = action.buttonIndex * BUTTON_WIDTH;
            Tooltips.instance?.showTooltipFor(this._hoverInsertIndicator, this, 'Insert');
        } else {
            this._hoverSwapIndicator.visible = true;
            this._hoverSwapIndicator.x = action.buttonIndex * BUTTON_WIDTH;
            Tooltips.instance?.showTooltipFor(
                this._hoverInsertIndicator,
                this,
                existsInHotbar ? 'Swap' : 'Replace'
            );
        }
    }

    /** Handle a dropped button if dropped over the hotbar */
    public handleButtonDrop(e: InteractionEvent, toolId: string): {activated: string[]; removedId?: string;} | null {
        this._hoverInsertIndicator.visible = false;
        this._hoverSwapIndicator.visible = false;
        const action = this.getHoverAction(e);
        if (!action) return null;

        if (action.action === 'insert') {
            // NOTE: I'm making some decisions on what the insertion semantics should be for when we have
            // buttons in our hotbar settings that aren't currently available and so aren't shown. If
            // we're inserting on the left/right edge, I think it makes the most sense to insert our new
            // tool immediately before/after the outermost visible tool, and not assume that we want to
            // put this tool beyond tools we can't currently see (if we do, we can move it when they show
            // back up). When inserting in the middle, there's not as much we can do. We should presumably
            // either insert next to the left or right currently visible tool, but beyond that the decision
            // is somewhat arbitrary because we can't really determine the user's intent. In that case,
            // we'll just do whatever is convenient.
            if (action.buttonIndex < this._visibleButtons.length) {
                const idToInsertBefore = this._visibleButtons[action.buttonIndex].id;
                // If we're inserting at the location the tool is already at, we can skip
                if (idToInsertBefore !== toolId) {
                    // If the tool already exists in this bay, remove the old copy
                    const currIdx = this._activatedTools.indexOf(toolId);
                    if (currIdx !== -1) this._activatedTools.splice(currIdx, 1);

                    const insertIdx = this._activatedTools.indexOf(idToInsertBefore);
                    // Shouldn't be possible - if a tool is visible it must have been in _availableButtons,
                    // which means it was in _activatedTools. If this happens, we must have removed something
                    // from availableButtons without calling updateButtons()/layout()
                    if (insertIdx === -1) throw new Error('Tool to insert before is not recorded as an active tool');
                    this._activatedTools.splice(insertIdx, 0, toolId);
                }
            } else {
                // We're inserting at the rightmost end, so there isn't a visible tool to insert before.
                // Instead, we need to insert _after_ the last tool
                const idToInsertAfter = this._visibleButtons[this._visibleButtons.length - 1].id;
                const insertIdx = this._activatedTools.indexOf(idToInsertAfter);
                // Shouldn't be possible - if a tool is visible it must have been in _availableButtons,
                // which means it was in _activatedTools. If this happens, we must have removed something
                // from availableButtons without calling updateButtons()/layout()
                if (insertIdx === -1) throw new Error('Tool to insert before is not recorded as an active tool');
                this._activatedTools.splice(insertIdx + 1, 0, toolId);
            }
            this.updateButtons();
            return {activated: this._activatedTools};
        } else {
            const idToReplace = this._visibleButtons[action.buttonIndex].id;
            const replaceIdx = this._activatedTools.indexOf(idToReplace);
            // Shouldn't be possible - if a tool is visible it must have been in _availableButtons,
            // which means it was in _activatedTools. If this happens, we must have removed something
            // from availableButtons without calling updateButtons()/layout()
            if (replaceIdx === -1) throw new Error('Tool to replace is not recorded as an active tool');

            // If the tool we're dropping is already in this hotbar, handle replacing it with the tool being
            // dropped over (so that if we return a removed ID, the main toolbar can assume it needs to get
            // dropped into the other hotbar).
            const toolCurrIdx = this._activatedTools.indexOf(toolId);
            if (toolCurrIdx !== -1) {
                // This will wind up being a noop if we pick up and drop a button at the same location
                // (toolCurrIdx and replaceIdx will be the same - write over with the existing value and
                // then remove and add the same value)
                this._activatedTools[toolCurrIdx] = this._activatedTools[replaceIdx];
                this._activatedTools.splice(replaceIdx, 1, toolId);
                this.updateButtons();
                return {activated: this._activatedTools};
            } else {
                const [removedId] = this._activatedTools.splice(replaceIdx, 1, toolId);
                this.updateButtons();
                return {activated: this._activatedTools, removedId};
            }
        }
    }

    /** Determine whether and how a button would be handled when dropped at the current mouse position */
    private getHoverAction(e: InteractionEvent): {action: 'insert' | 'replace', buttonIndex: number} | null {
        if (DisplayUtil.hitTest(this.container, e.data.global)) {
            const localX = e.data.getLocalPosition(this.container).x;
            const buttonIndex = localX > 0 ? Math.floor(localX / BUTTON_WIDTH) : 0;
            const distanceFromButtonLeftEdge = localX % BUTTON_WIDTH;

            if (distanceFromButtonLeftEdge < BUTTON_WIDTH * 0.25 || this._visibleButtons.length === 0) {
                return {action: 'insert', buttonIndex};
            } else if (distanceFromButtonLeftEdge > BUTTON_WIDTH * 0.75) {
                return {action: 'insert', buttonIndex: buttonIndex + 1};
            } else {
                return {action: 'replace', buttonIndex};
            }
        }
        return null;
    }

    /** Deactivate a tool due to being trashed, inserted into the other hotbar, or swapped */
    public deactivateTool(toolId: string, replaceWith?: string) {
        const toolIdx = this._activatedTools.indexOf(toolId);
        if (toolIdx !== -1) {
            if (replaceWith) this._activatedTools.splice(toolIdx, 1, replaceWith);
            else this._activatedTools.splice(toolIdx, 1);
        }
        this.updateButtons();
    }

    public isToolActive(toolId: string): boolean {
        return this._activatedTools.includes(toolId);
    }

    public disableTools(disable: boolean) {
        for (const button of this._buttons) {
            button.enabled = !disable;
        }
    }

    public changeActivePaintTool(toolId: string) {
        for (const button of this._buttons) {
            if (button.id === toolId) button.toggled.value = true;
            else if (button.isPaintTool) button.toggled.value = false;
        }
    }

    public getTooltipPositioners(): ToolTipPositioner[] {
        const getBounds = (elem: ContainerObject) => {
            const globalPos = elem.container.toGlobal(new Point());
            return new Rectangle(
                globalPos.x,
                globalPos.y,
                elem.container.width,
                elem.container.height
            );
        };
        return this._visibleButtons.map((button) => [() => getBounds(button), 0, button.displayName]);
    }

    public set targetWidth(val: number) {
        this._targetWidth = val;
        this.layout();
    }

    public get targetWidth(): number {
        return this._targetWidth;
    }

    public get maxWidth(): number {
        return Math.max(this._availableButtons.length * BUTTON_WIDTH, BUTTON_WIDTH);
    }

    public set editable(val: boolean) {
        this._editable = val;
        this.drawBackground();
    }

    public get editable(): boolean {
        return this._editable;
    }

    private get _availableButtons(): ToolbarButton[] {
        return this._buttons
            .filter((button) => this._activatedTools.includes(button.id))
            .sort((a, b) => {
                const aPos = this._activatedTools.findIndex((toolId) => a.id === toolId);
                const bPos = this._activatedTools.findIndex((toolId) => b.id === toolId);
                return aPos < bPos ? -1 : 1;
            });
    }

    private get _visibleButtons(): ToolbarButton[] {
        return this._buttons
            .filter((button) => button.display.visible && button.display.parent)
            .sort((a, b) => {
                const aPos = this._activatedTools.findIndex((toolId) => a.id === toolId);
                const bPos = this._activatedTools.findIndex((toolId) => b.id === toolId);
                return aPos < bPos ? -1 : 1;
            });
    }

    private _background: Graphics;
    private _hoverSwapIndicator: Graphics;
    private _hoverInsertIndicator: Graphics;
    private _content: HLayoutContainer;
    private _buttons: ToolbarButton[] = [];

    private _hideFrom: 'left' | 'right';
    private _activatedTools: string[] = [];
    private _targetWidth: number = 0;
    private _editable: boolean = false;
}
