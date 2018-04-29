import * as PIXI from "pixi.js";
import {Point} from "pixi.js";
import {Assert} from "../util/Assert";
import {FlashbangApp} from "./FlashbangApp";

type InteractionManager = PIXI.interaction.InteractionManager;

export class Flashbang {
    public static get app () :FlashbangApp { return Flashbang._app; }
    public static get pixi () :PIXI.Application { return Flashbang._app.pixi; }
    public static get stageWidth () :number { return Flashbang._app.pixi.screen.width; }
    public static get stageHeight () :number { return Flashbang._app.pixi.screen.height; }
    public static get mouse (): Point { return this._interaction.mouse.global; }

    /*internal*/ static registerApp (app :FlashbangApp) :void {
        Assert.isTrue(Flashbang._app == null, "A FlashbangApp has already been registered");
        Flashbang._app = app;
        Flashbang._interaction = app.pixi.renderer.plugins.interaction;
    }

    private static _app :FlashbangApp;
    private static _interaction: InteractionManager;
}
