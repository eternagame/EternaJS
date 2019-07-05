import {EternaSettings} from 'eterna/settings';
import * as log from 'loglevel';

export default class ChatManager {
    constructor(chatboxID: string, settings: EternaSettings) {
        this._chatbox = document.getElementById(chatboxID);
        if (this._chatbox == null) {
            log.warn(`Missing chatbox (id=${chatboxID})`);
        } else {
            let iframe: HTMLIFrameElement = this._chatbox.getElementsByTagName('iframe')[0];
            if (iframe == null) {
                log.warn(`No iframe in chatbox (id=${chatboxID}`);
            } else {
                this._chatIFrame = iframe.contentWindow;
            }
        }

        this._settings = settings;
        settings.showChat.connectNotify(() => this.updateChatVisibility());
    }

    /** Posts a message to the chat */
    public postText(text: string): void {
        if (this._chatIFrame != null) {
            this._chatIFrame.postMessage({type: 'chat-message', content: text}, '*');
        }
    }

    /** Increases the hideChat counter. Chat is visible if the counter is 0. */
    public pushHideChat(): void {
        this._hideChat++;
        this.updateChatVisibility();
    }

    /** Decreases the hideChat counter. Chat is visible if the counter is 0. */
    public popHideChat(): void {
        if (this._hideChat <= 0) {
            log.warn('popHideChat, but no matching pushHideChat');
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
        this._chatbox.style.display = show ? null : 'none';
        if (show) this._chatIFrame.postMessage({type: 'chat-scroll'}, '*');
    }

    private readonly _chatbox: HTMLElement;
    private readonly _chatIFrame: Window;
    private readonly _settings: EternaSettings;

    private _hideChat: number = 0;
}
