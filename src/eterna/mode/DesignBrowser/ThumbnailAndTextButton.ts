import GameButton from 'eterna/ui/GameButton';
import {Container, Graphics} from 'pixi.js';
import {HLayoutContainer} from 'flashbang';
import Fonts from 'eterna/util/Fonts';

interface ThumbnailAndTextButtonProps {
    thumbnail: Container;
    text: string;
}

export default class ThumbnailAndTextButton extends GameButton {
    constructor(props: ThumbnailAndTextButtonProps) {
        super();

        const SIZE = 52;

        const thumbnailFrame = new Graphics()
            .lineStyle(2, 0xC0DCE7)
            .beginFill(0x0f254a)
            .drawRoundedRect(0, 0, SIZE, SIZE, 10)
            .endFill();
        thumbnailFrame.addChild(props.thumbnail);
        const {width, height} = props.thumbnail.getBounds();
        props.thumbnail.x += (SIZE - width) / 2;
        props.thumbnail.y += (SIZE - height) / 2;

        const view = new HLayoutContainer(10);
        this.container.addChild(view);
        view.addChild(thumbnailFrame);
        view.addChild(Fonts.std(props.text, 14).bold().color(0xffffff).build());
        view.layout(true);

        this.allStates(view);
    }

    public tooltip(text: string): ThumbnailAndTextButton {
        super.tooltip(text);
        return this;
    }
}
