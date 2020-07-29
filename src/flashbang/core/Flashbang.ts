import Assert from 'flashbang/util/Assert';
import {SoundManager} from 'flashbang';
import FlashbangApp from './FlashbangApp';
import AppMode from './AppMode';

type InteractionManager = PIXI.interaction.InteractionManager;

export default class Flashbang {
    public static get app(): FlashbangApp {
        return Flashbang._app;
    }

    public static get curMode(): AppMode | null {
        return Flashbang._app.modeStack.topMode;
    }

    public static get pixi(): PIXI.Application | null {
        return Flashbang._app.pixi;
    }

    public static get stageWidth(): number | null {
        return Flashbang._app.pixi ? Flashbang._app.pixi.screen.width : null;
    }

    public static get stageHeight(): number | null {
        return Flashbang._app.pixi ? Flashbang._app.pixi.screen.height : null;
    }

    /** Global mouse location */
    public static get globalMouse(): PIXI.Point | null {
        return this._interaction ? this._interaction.mouse.global : null;
    }

    public static get sound(): SoundManager {
        return this._sound;
    }

    public static get supportsTouch(): boolean | null {
        return this._interaction?.supportsTouchEvents || null;
    }

    /* internal */
    public static _registerApp(app: FlashbangApp): void {
        Assert.isTrue(Flashbang._app == null, 'A FlashbangApp has already been registered');
        Flashbang._app = app;
        Flashbang._interaction = app.pixi ? app.pixi.renderer.plugins.interaction : null;
        Flashbang._sound = new SoundManager();
    }

    private static _app: FlashbangApp;
    private static _interaction: InteractionManager | null;
    private static _sound: SoundManager;
}
