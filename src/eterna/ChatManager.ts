import log from 'loglevel';
import {register, EternaChat, sendMessage} from '@eternagame/chat';
import {Signal} from 'signals';
import {Assert, Flashbang} from 'flashbang';
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
        sendMessage(text);
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

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const show = this._settings.showChat.value && this._hideChat <= 0 && !Eterna.noGame;
        if (show) {
            if (!this._chat) {
                register();
                this._chat = new EternaChat({
                    username: Eterna.playerName,
                    uid: `${Eterna.playerID}`,
                    appContext: 'designer',
                    defaultX: Flashbang.stageWidth - 400 - 30,
                    defaultY: 140,
                    defaultWidth: 400,
                    defaultHeight: 350
                });
                this._chatbox.appendChild(this._chat);
            } else {
                this._chat.style.display = '';
            }
        } else if (this._chat) {
            this._chat.style.display = 'none';
        }

        this.chatVisibilityChanged.emit({show, bound: this._chatbox.getBoundingClientRect()});
    }

    public dispose() {
        this.pushHideChat();
        if (this._chatbox) this._chatbox.innerHTML = '';
    }

    public readonly chatVisibilityChanged: Signal<{show:boolean, bound:{
        x:number,
        y:number,
        width: number,
        height: number
    }}> = new Signal();

    private readonly _chatbox: HTMLElement | null;
    private readonly _settings: EternaSettings;
    private _chat: HTMLElement;

    private _hideChat: number = 0;
}
