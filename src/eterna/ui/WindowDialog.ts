import {HAlign, VAlign} from 'flashbang';
import Dialog from './Dialog';
import GameWindow from './GameWindow';

/** Convenience base class for dialog objects. */
export default abstract class WindowDialog<T> extends Dialog<T> {
    constructor(props: {
        title?:string,
        modal?: boolean,
        horizontalContentMargin?: number
        verticalContentMargin?: number,
        contentHAlign?: HAlign,
        contentVAlign?: VAlign,
        windowBgColor?: number;
        windowBgAlpha?: number;
    }) {
        super(props.modal ?? false);
        this._title = props.title ?? '';
        this._horizontalContentMargin = props.horizontalContentMargin;
        this._verticalContentMargin = props.verticalContentMargin;
        this._contentHAlign = props.contentHAlign;
        this._contentVAlign = props.contentVAlign;
        this._windowBgColor = props.windowBgColor;
        this._windowBgAlpha = props.windowBgAlpha;
    }

    protected added() {
        super.added();
        this._window = new GameWindow({
            movable: !this.modal,
            resizable: !this.modal,
            closable: !this.modal,
            ensureOnScreen: this.modal,
            title: this._title,
            horizontalContentMargin: this._horizontalContentMargin,
            verticalContentMargin: this._verticalContentMargin,
            contentHAlign: this._contentHAlign,
            contentVAlign: this._contentVAlign,
            bgColor: this._windowBgColor,
            bgAlpha: this._windowBgAlpha
        });
        this._window.setTargetBounds({
            x: {from: 'center', offsetExact: 0},
            y: {from: 'center', offsetExact: 0}
        });
        this.addObject(this._window, this.container);
        this.regs.add(this._window.closeClicked.connect(() => this.close(null)));
    }

    protected onBGClicked(): void {
        this.close(null);
    }

    protected _window: GameWindow;

    protected _title: string;
    protected _horizontalContentMargin?: number;
    protected _verticalContentMargin?: number;
    protected _contentHAlign: HAlign | undefined;
    protected _contentVAlign: VAlign | undefined;
    protected _windowBgColor?: number;
    protected _windowBgAlpha?: number;
}
