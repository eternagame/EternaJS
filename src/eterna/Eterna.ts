import * as log from 'loglevel';
import {SaveGameManager, ErrorUtil, Flashbang} from 'flashbang';
import ChatManager from 'eterna/ChatManager';
import EternaApp from 'eterna/EternaApp';
import EternaSettings from './settings/EternaSettings';
import GameClient from './net/GameClient';
import ErrorDialogMode from './mode/ErrorDialogMode';

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
    public static readonly MAX_PUZZLE_EDIT_LENGTH = 400; // max length of PuzzleEditMode input

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

    public static playerID: number;
    public static playerName: string;

    public static setPlayer(name: string, id: number): void {
        this.playerName = name;
        this.playerID = id;
    }

    public static onFatalError(err: Error | ErrorEvent): void {
        log.error('Fatal error error', ErrorUtil.getErrorObj(err) || ErrorUtil.getErrString(err));
        if (Flashbang.app != null
            && Flashbang.app.modeStack != null
            && !(Flashbang.app.modeStack.topMode instanceof ErrorDialogMode)) {
            Flashbang.app.modeStack.pushMode(new ErrorDialogMode(err));
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
