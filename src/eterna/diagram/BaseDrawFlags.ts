/** View state flags for Base.as rendering */
export default class BaseDrawFlags {
    /** If set, the base will have a lock icon on it */
    public static LOCKED: number = 1 << 0;

    /** If set, the base will have its letter (A, C, G, or U) drawn on top of it at higher zoom levels */
    public static LETTER_MODE: number = 1 << 1;

    /** If set, fancy animations and effects are disabled */
    public static LOW_PERFORM: number = 1 << 2;

    /**
     * Set if the base is part of a "unique marker sequence".
     * The base will be drawn with a white stippled outline around it.
     */
    public static USE_BARCODE: number = 1 << 3;

    /**
     * Set if the location this base folds to doesn't matter.
     * The base will be drawn with a purple hilite (instead of white)
     */
    public static IS_DONTCARE: number = 1 << 4;

    /** Fluent builder functions */
    public static builder(initialFlags: number = 0): BaseDrawFlags {
        let out: BaseDrawFlags = new BaseDrawFlags();
        out._flags = initialFlags;
        return out;
    }

    public locked(val: boolean = true): BaseDrawFlags {
        this._flags = (val ? this._flags | BaseDrawFlags.LOCKED : this._flags & ~BaseDrawFlags.LOCKED);
        return this;
    }

    public letterMode(val: boolean = true): BaseDrawFlags {
        this._flags = (val ? this._flags | BaseDrawFlags.LETTER_MODE : this._flags & ~BaseDrawFlags.LETTER_MODE);
        return this;
    }

    public lowPerform(val: boolean = true): BaseDrawFlags {
        this._flags = (val ? this._flags | BaseDrawFlags.LOW_PERFORM : this._flags & ~BaseDrawFlags.LOW_PERFORM);
        return this;
    }

    public useBarcode(val: boolean = true): BaseDrawFlags {
        this._flags = (val ? this._flags | BaseDrawFlags.USE_BARCODE : this._flags & ~BaseDrawFlags.USE_BARCODE);
        return this;
    }

    public isDontCare(val: boolean = true): BaseDrawFlags {
        this._flags = (val ? this._flags | BaseDrawFlags.IS_DONTCARE : this._flags & ~BaseDrawFlags.IS_DONTCARE);
        return this;
    }

    public result(): number {
        return this._flags;
    }

    private _flags: number;
}
