type InteractionEvent = PIXI.interaction.InteractionEvent;

export const IsLeftMouse = (e: InteractionEvent) => e.data.isPrimary;
