type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class InputUtil {
    public static IsLeftMouse = (e: InteractionEvent): boolean => {
        if (e.data.pointerType === 'mouse') {
            return e.data.button === 0;
        } else {
            return true;
        }
    };

    public static scrollAmount(e: MouseWheelEvent, lineHeight: number, pageHeight: number): number {
        switch (e.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL:
                return e.deltaY;
            case WheelEvent.DOM_DELTA_LINE:
                return e.deltaY * lineHeight;
            case WheelEvent.DOM_DELTA_PAGE:
                return e.deltaY * pageHeight;
            default:
                throw new Error('Unhandled scroll delta mode');
        }
    }
}
