type InteractionEvent = PIXI.interaction.InteractionEvent;
export default class InputUtil {
    public static IsLeftMouse = (e: InteractionEvent): boolean => e.data.isPrimary;
}
