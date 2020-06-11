import * as log from 'loglevel';
import {Chat} from 'eterna-chat-wrapper';
import EternaSettings from './settings/EternaSettings';
import Eterna from './Eterna';

export default class ChatManager {
    constructor(chatboxID: string, settings: EternaSettings) {
        this._chatbox = document.getElementById(chatboxID);
        if (this._chatbox == null) {
            log.warn(`Missing chatbox (id=${chatboxID})`);
        }
        this._settings = settings;
        settings.showChat.connectNotify(() => this.updateChatVisibility());
    }

    /** Posts a message to the chat */
    public postText(text: string): void {
        if (this._chat) {
            this._chat.postMessage({type: 'chat-message', content: text}, '*');
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

        const show = this._settings.showChat.value && this._hideChat <= 0;
        if (show) {
            if (!this._chat) {
                this._chat = new Chat({
                    container: this._chatbox,
                    username: Eterna.playerName,
                    uid: `${Eterna.playerID}`,
                    backgroundColor: 'rgba(0, 16, 38, 0.6)',
                    onHidden: () => {
                        this._settings.showChat.value = false;
                    }
                });
            } else {
                this._chat.postMessage({type: 'chat-scroll'}, '*');
                this._chat.show();
            }
        } else if (this._chat) {
            this._chat.hide();
        } else {
            this._chatbox.classList.add('hidden');
        }
    }

    private readonly _chatbox: HTMLElement | null;
    private readonly _settings: EternaSettings;
    private _chat: Chat;

    private _hideChat: number = 0;
}
