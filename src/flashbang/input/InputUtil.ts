type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class InputUtil {
    public static IsLeftMouse = (e: InteractionEvent): boolean => {
        if (e.data.pointerType === 'mouse') {
            return e.data.button === 0;
        } else {
            return true;
        }
    };
}
