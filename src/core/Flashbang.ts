import {Assert} from "../util/Assert";
import {FlashbangApp} from "./FlashbangApp";

export class Flashbang {
    public static get app () :FlashbangApp { return Flashbang._app; }
    public static get pixi () :PIXI.Application { return Flashbang._app.pixi; }
    public static get stageWidth () :number { return Flashbang._app.pixi.screen.width; }
    public static get stageHeight () :number { return Flashbang._app.pixi.screen.height; }

    /*internal*/ static registerApp (app :FlashbangApp) :void {
        Assert.isTrue(Flashbang._app == null, "A FlashbangApp has already been registered");
        Flashbang._app = app;
    }

    private static _app :FlashbangApp;
}
