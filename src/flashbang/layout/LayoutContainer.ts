import {Container, Graphics} from 'pixi.js';

/** A base class for Containers that arrange their children automatically. */
export default abstract class LayoutContainer extends Container {
    public get needsLayout(): boolean {
        return this._needsLayout;
    }

    public override addChildAt<T extends Container>(child: T, index: number): T {
        this._needsLayout = true;
        return super.addChildAt(child, index);
    }

    public override addChild<T extends Container>(...children: T[]): T {
        this._needsLayout = true;
        return super.addChild(...children);
    }

    // AMW TODO: Painfully, because pixi type definitions require specific
    // return types for removeChildAt and removeChildren, we have to return
    // DisplayObject instead of T.

    public override removeChildAt<T extends Container = Container>(index: number): T {
        this._needsLayout = true;
        return super.removeChildAt(index);
    }

    public override removeChild<T extends Container = Container>(...children: T[]): T {
        this._needsLayout = true;
        return super.removeChild(...children);
    }

    public override removeChildren<T extends Container = Container>(beginIndex?: number, endIndex?: number): T[] {
        this._needsLayout = true;
        return super.removeChildren(beginIndex, endIndex) as T[];
    }

    public layout(force: boolean = false): void {
        if (this._isLayingOut || (!this._needsLayout && !force)) {
            return;
        }
        this._needsLayout = false;
        this._isLayingOut = true;

        // Recursively lay out our children if they need it.
        for (const child of this.children) {
            if (child instanceof LayoutContainer) {
                child.layout(force);
            }
        }

        // Layout ourselves.
        this.doLayout();

        // If our parent is a layout sprite, force it to re-layout, since our size has
        // likely changed.
        if (this.parent instanceof LayoutContainer) {
            const layoutParent = this.parent;
            if (!layoutParent._isLayingOut) {
                layoutParent.layout(true);
            }
        }

        this._isLayingOut = false;
    }

    protected static createSpacer(width: number, height: number): Container {
        return new Spacer(width, height);
    }

    protected abstract doLayout(): void;

    protected _needsLayout: boolean;
    private _isLayingOut: boolean;
}

class Spacer extends Container {
    constructor(width: number, height: number) {
        super();

        // For some reasons, spacers have zero-width bounds
        // unless they're wrapped in a Container
        const space = new Graphics()
            .rect(0, 0, width, height)
            .fill({color: 0x0, alpha: 0});
        this.addChild(space);
    }
}
