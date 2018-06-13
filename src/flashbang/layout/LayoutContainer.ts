import {Container, DisplayObject} from "pixi.js";

/** A base class for Containers that arrange their children automatically. */
export abstract class LayoutContainer extends Container {
    public get needsLayout(): boolean {
        return this._needsLayout;
    }

    /*override*/
    public addChildAt<T extends DisplayObject>(child: T, index: number): T {
        this._needsLayout = true;
        return super.addChildAt(child, index);
    }

    /*override*/
    public addChild<T extends DisplayObject>(child: T, ...additionalChildren: DisplayObject[]): T {
        this._needsLayout = true;
        return super.addChild(child, ...additionalChildren);
    }

    /*override*/
    public removeChildAt(index: number): DisplayObject {
        this._needsLayout = true;
        return super.removeChildAt(index);
    }

    /*override*/
    public removeChild(child: DisplayObject): DisplayObject {
        this._needsLayout = true;
        return super.removeChild(child);
    }

    /*override*/
    public removeChildren(beginIndex?: number, endIndex?: number): DisplayObject[] {
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
            let layoutParent: LayoutContainer = (<LayoutContainer>this.parent);
            if (!layoutParent._isLayingOut) {
                layoutParent.layout(true);
            }
        }

        this._isLayingOut = false;
    }

    protected abstract doLayout(): void;

    protected _needsLayout: boolean;
    private _isLayingOut: boolean;
}

