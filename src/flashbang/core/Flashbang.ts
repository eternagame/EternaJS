import Assert from 'flashbang/util/Assert';
import {SoundManager} from 'flashbang';
import {Application, Point} from 'pixi.js';
import {EventSystem} from '@pixi/events';
import FlashbangApp from './FlashbangApp';
import AppMode from './AppMode';

export default class Flashbang {
    public static get app(): FlashbangApp {
        return Flashbang._app;
    }

    public static get curMode(): AppMode | null {
        return Flashbang._app.modeStack.topMode;
    }

    public static get pixi(): Application | null {
        return Flashbang._app.pixi;
    }

    public static get stageWidth(): number | null {
        return Flashbang._app.pixi ? Flashbang._app.pixi.screen.width : null;
    }

    public static get stageHeight(): number | null {
        return Flashbang._app.pixi ? Flashbang._app.pixi.screen.height : null;
    }

    /** Global mouse location */
    public static get globalMouse(): Point {
        return this._app.globalMouse;
    }

    public static get sound(): SoundManager {
        return this._sound;
    }

    public static get supportsTouch(): boolean | null {
        return this._eventSystem?.supportsTouchEvents || null;
    }

    /* internal */
    public static _registerApp(app: FlashbangApp): void {
        Assert.isTrue(Flashbang._app == null, 'A FlashbangApp has already been registered');
        Flashbang._app = app;
        Flashbang._eventSystem = app.pixi ? app.pixi.renderer.events : null;
        Flashbang._sound = new SoundManager();
    }

    public static dispose() {
        // @ts-expect-error Ok to remove on shutdown
        delete Flashbang._app;
        // @ts-expect-error Ok to remove on shutdown
        delete Flashbang._eventSystem;
        // @ts-expect-error Ok to remove on shutdown
        delete Flashbang._sound;
    }

    private static _app: FlashbangApp;
    private static _eventSystem: EventSystem | null;
    private static _sound: SoundManager;
}
