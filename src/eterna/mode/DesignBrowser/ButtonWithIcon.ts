import GameButton from 'eterna/ui/GameButton';
import {
    Graphics, Sprite, Container, Point
} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {HLayoutContainer, VAlign} from 'flashbang';

interface TextProps {
    text: string;
    color?: number;
    size?: number;
}

interface ButtonWithIconProps {
    text: TextProps;
    icon: string;
    iconPosition?: 'left' | 'right'; // default is left
    frame?: Container | null; // pass null to have no frame.
}

export default class ButtonWithIcon extends GameButton {
    private static readonly theme = {
        color: 0x54B54E,
        margin: {
            horizontal: 10,
            vertical: 6
        },
        spacing: 4
    };

    constructor(props: ButtonWithIconProps) {
        super();
        this._view = new Container();
        this.container.addChild(this._view);
        this.updateView(props);
        this.allStates(this._view);
    }

    public updateView(props: ButtonWithIconProps) {
        const {theme} = ButtonWithIcon;
        const icon = Sprite.from(props.icon);
        const text = Fonts.std(props.text.text, props.text.size ?? 14)
            .bold()
            .color(props.text.color ?? 0xffffff)
            .build();

        const layout = new HLayoutContainer(theme.spacing, VAlign.CENTER);
        layout.addChild(text);
        const iconPosition = props.iconPosition ?? 'left';
        layout.addChildAt(icon, iconPosition === 'left' ? 0 : 1);
        layout.layout(true);
        layout.position = new Point(theme.margin.horizontal, theme.margin.vertical);

        this._view.removeChildren();

        if (props.frame === undefined) {
            // Make a default frame
            const width = theme.margin.horizontal * 2 + layout.width;
            const height = theme.margin.vertical * 2 + layout.height;
            const frame = new Graphics()
                .beginFill(theme.color)
                .drawRoundedRect(0, 0, width, height, 5)
                .endFill();
            this._view.addChild(frame);
        } else if (props.frame) {
            this._view.addChild(props.frame);
        }

        this._view.addChild(layout);
    }

    public tooltip(text: string): ButtonWithIcon {
        super.tooltip(text);
        return this;
    }

    private _view: Container;
}
