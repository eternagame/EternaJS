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

        const thumbnailContainer = new Container();
        thumbnailContainer.label = 'Thumbnail Container';
        const thumbnailFrame = new Graphics()
            .roundRect(0, 0, SIZE, SIZE, 10)
            .fill(0x0f254a)
            .stroke({width: 2, color: 0XC0DCE7});
        thumbnailContainer.addChild(thumbnailFrame);
        thumbnailContainer.addChild(props.thumbnail);

        const {width, height} = props.thumbnail.getLocalBounds();
        props.thumbnail.x += (SIZE - width) / 2;
        props.thumbnail.y += (SIZE - height) / 2;

        const view = new HLayoutContainer(10);
        this.container.addChild(view);
        view.addChild(thumbnailContainer);
        view.addChild(Fonts.std(props.text, 14).bold().color(0xffffff).build());
        view.layout(true);

        this.allStates(view);
    }
}
