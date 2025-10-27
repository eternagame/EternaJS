import log from 'loglevel';
import {SaveGameManager, ErrorUtil, Flashbang} from 'flashbang';
import ChatManager from 'eterna/ChatManager';
import EternaApp from 'eterna/EternaApp';
import EternaSettings from './settings/EternaSettings';
import GameClient from './net/GameClient';
import ErrorDialogMode from './mode/ErrorDialogMode';
import ObservabilityManager from './observability/ObservabilityManager';

/** Return env.APP_SERVER_URL; if unspecified, default to window.location.origin */
function GetServerURL(): string {
    const url = process.env['APP_SERVER_URL'];
    return (url != null && url !== '' ? url : window.location.origin);
}

function ParseBool(value: string | undefined): boolean {
    return value !== undefined && value.toLowerCase() === 'true';
}

/**
 * This class serves as a container for some constants and singleton managers.
 * It also contains some fallback error handling (like onFatalError).
 */

export default class Eterna {
    public static readonly OVERLAY_DIV_ID = 'eterna-overlay';
    public static readonly PIXI_CONTAINER_ID = 'pixi-container';
    public static readonly MAX_PUZZLE_EDIT_LENGTH = 4000; // max length of PuzzleEditMode input

    // If DEBUG is not set, dev mode isn't true.
    public static readonly DEV_MODE: boolean = ParseBool(process.env['DEBUG']);
    public static readonly SERVER_URL: string = GetServerURL();
    public static readonly MOBILE_APP: boolean = ParseBool(process.env['MOBILE_APP']);

    public static gameDiv: HTMLElement | null;

    public static app: EternaApp;
    public static settings: EternaSettings;
    public static saveManager: SaveGameManager;
    public static client: GameClient;
    public static chat: ChatManager;
    public static observability: ObservabilityManager;

    public static playerID: number;
    public static playerName: string;

    public static noGame: boolean;

    public static experimentalFeatures: ('rnet-publishing')[];

    public static setPlayer(name: string, id: number): void {
        this.playerName = name;
        this.playerID = id;
    }

    public static onFatalError(err: Error | ErrorEvent, title?: string): void {
        log.error('Fatal error error', ErrorUtil.getErrorObj(err) || ErrorUtil.getErrString(err));
        if (
            Flashbang.app != null
            && Flashbang.app.modeStack != null
            && !(Flashbang.app.modeStack.topMode instanceof ErrorDialogMode)
        ) {
            Flashbang.app.modeStack.pushMode(new ErrorDialogMode(err, title));
            // If the error occurred in our update loop, the error will have meant Pixi's update
            // routine stopped before it could queue up the next frame. We need to keep the update
            // loop running in order to show our error dialog (...and let things keep running
            // if they can)
            Flashbang.app.pixi?.ticker.stop();
            Flashbang.app.pixi?.ticker.start();
        } else if (process.env.NODE_ENV !== 'production') {
            try {
                // eslint-disable-next-line no-alert
                alert(ErrorUtil.getErrorObj(err) || ErrorUtil.getErrString(err));
            } catch (alertError) {
                log.error('An error occurred while trying to display an error', alertError);
            }
        }
    }
}
