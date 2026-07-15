import log from 'loglevel';
import {register as registerChat, EternaChat, sendMessage} from '@eternagame/chat';
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

        Assert.assertIsDefined(Flashbang.stageWidth);
        // Even if our settings say the chat should be shown, dont show it on initial page load
        // if we're on a small screen, because at this size the app is basically unusable, so
        // we only want to show it when actively requested, not if it was shown the last time
        // the app was opened. We do the extra work of forcing the setting to on if it isn't
        // when the settings is initially toggled instead of just forcing the setting to off
        // initially because opening a new window after opening a smaller window it would
        // be surprising that your "setting" changed because you never actively changed it
        if (Flashbang.stageWidth < 1100) {
            this.pushHideChat();
            settings.showChat.connect((show) => {
                this.popHideChat();
                if (!show) {
                    setTimeout(() => {
                        settings.showChat.value = true;
                    });
                }
            }).once();
        }

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
        if (this._chatbox == null) return;

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const show = this._settings.showChat.value && this._hideChat <= 0 && !Eterna.noGame;
        if (show) {
            if (!this._chat) {
                registerChat();
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
