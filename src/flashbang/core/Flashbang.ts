import * as PIXI from 'pixi.js';
import Assert from 'flashbang/util/Assert';
import {SoundManager} from 'flashbang';
import FlashbangApp from './FlashbangApp';
import AppMode from './AppMode';

type InteractionManager = PIXI.interaction.InteractionManager;

export default class Flashbang {
    public static get app(): FlashbangApp {
        return Flashbang._app;
    }

    public static get curMode(): AppMode {
        return Flashbang._app.modeStack.topMode;
    }

    public static get pixi(): PIXI.Application {
        return Flashbang._app.pixi;
    }

    public static get stageWidth(): number {
        return Flashbang._app.pixi.screen.width;
    }

    public static get stageHeight(): number {
        return Flashbang._app.pixi.screen.height;
    }

    /** Global mouse location */
    public static get globalMouse(): PIXI.Point {
        return this._interaction.mouse.global;
    }

    public static get sound(): SoundManager {
        return this._sound;
    }

    /* internal */
    public static _registerApp(app: FlashbangApp): void {
        Assert.isTrue(Flashbang._app == null, 'A FlashbangApp has already been registered');
        Flashbang._app = app;
        Flashbang._interaction = app.pixi.renderer.plugins.interaction;
        Flashbang._sound = new SoundManager();
    }

    private static _app: FlashbangApp;
    private static _interaction: InteractionManager;
    private static _sound: SoundManager;
}
