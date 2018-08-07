export class UIPos {
	public static readonly CENTER: string = "CENTER";
	public static readonly BASE: string = "BASE";
	public static readonly UDIM: string = "UDIM";
	public static readonly PALLETE: string = "PALLETE";
	public static readonly MODES: string = "MODES";
	public static readonly MODES_NATIVE: string = "MODES_NATIVE";
	public static readonly MODES_TARGET: string = "MODES_TARGET";
	public static readonly UNDO_BUTTON: string = "UNDO_BUTTON";
	public static readonly ZOOM_IN_BUTTON: string = "ZOOM_IN_BUTTON";
	public static readonly ZOOM_OUT_BUTTON: string = "ZOOM_OUT_BUTTON";
	public static readonly CONSTRAINT: string = "CONSTRAINT";

	public static UDIM_(rel_x: number, rel_y: number, pix_x: number, pix_y: number): string {
	    return `${UIPos.UDIM} ${rel_x} ${rel_y} ${pix_x} ${pix_y}`;
	}

	public static BASE_(val: number): string {
	    return `${UIPos.BASE} ${val}`;
	}

	public static CONSTRAINT_(val: number) :string {
	    return `${UIPos.CONSTRAINT} ${val}`;
	}
}
