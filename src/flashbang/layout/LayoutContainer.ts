import {Container, DisplayObject, Sprite} from "pixi.js";

/** A base class for Containers that arrange their children automatically. */
export default abstract class LayoutContainer extends Container {
    public get needsLayout(): boolean {
        return this._needsLayout;
    }

    /* override */
    public addChildAt<T extends DisplayObject>(child: T, index: number): T {
        this._needsLayout = true;
        return super.addChildAt(child, index);
    }

    /* override */
    public addChild<T extends DisplayObject>(...children: T[]): T {
        this._needsLayout = true;
        return super.addChild(...children);
    }

    /* override */
    public removeChildAt<T extends DisplayObject = Container>(index: number): T {
        this._needsLayout = true;
        return super.removeChildAt(index);
    }

    /* override */
    public removeChild<T extends DisplayObject = Container>(child: DisplayObject): T {
        this._needsLayout = true;
        return super.removeChild(child);
    }

    /* override */
    public removeChildren<T extends DisplayObject = Container>(beginIndex?: number, endIndex?: number): T[] {
        this._needsLayout = true;
        return super.removeChildren(beginIndex, endIndex);
    }

    public layout(force: boolean = false): void {
        if (this._isLayingOut || (!this._needsLayout && !force)) {
            return;
        }
        this._needsLayout = false;
        this._isLayingOut = true;

        // Recursively lay out our children if they need it.
        for (let child of this.children) {
            if (child instanceof LayoutContainer) {
                (<LayoutContainer> child).layout(force);
            }
        }

        // Layout ourselves.
        this.doLayout();

        // If our parent is a layout sprite, force it to re-layout, since our size has
        // likely changed.
        if (this.parent instanceof LayoutContainer) {
            let layoutParent: LayoutContainer = (<LayoutContainer> this.parent);
            if (!layoutParent._isLayingOut) {
                layoutParent.layout(true);
            }
        }

        this._isLayingOut = false;
    }

    protected static createSpacer(width: number, height: number): DisplayObject {
        return new Spacer(width, height);
    }

    protected abstract doLayout(): void;

    protected _needsLayout: boolean;
    private _isLayingOut: boolean;
}

class Spacer extends Container {
    public constructor(width: number, height: number) {
        super();

        // For some reasons, spacers have zero-width bounds
        // unless they're wrapped in a Container
        let sprite = new Sprite();
        sprite.width = width;
        sprite.height = height;
        this.addChild(sprite);
    }
}
