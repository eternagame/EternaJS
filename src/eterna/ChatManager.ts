import {EternaSettings} from "./settings/EternaSettings";
import * as log from "loglevel";

export class ChatManager {
    public constructor(chatboxID: string, settings: EternaSettings) {
        this._chatbox = document.getElementById(chatboxID);
        if (this._chatbox == null) {
            log.warn(`Missing chatbox (id=${chatboxID})`);
        }

        this._settings = settings;
        settings.showChat.connectNotify(() => this.updateChatVisibility());
    }

    /** Increases the hideChat counter. Chat is visible if the counter is 0. */
    public pushHideChat(): void {
        this._hideChat++;
        this.updateChatVisibility();
    }

    /** Decreases the hideChat counter. Chat is visible if the counter is 0. */
    public popHideChat(): void {
        if (this._hideChat <= 0) {
            log.warn("popHideChat, but no matching pushHideChat")
        } else {
            this._hideChat--;
            this.updateChatVisibility();
        }
    }

    private updateChatVisibility(): void {
        if (this._chatbox == null) {
            return;
        }

        let show = this._settings.showChat.value && this._hideChat <= 0;
        this._chatbox.style.display = show ? null : "none";
    }

    private readonly _chatbox: HTMLElement;
    private readonly _settings: EternaSettings;

    private _hideChat: number = 0;
}
