import { ContainerObject, StyledTextBuilder } from "flashbang";
import Fonts from "eterna/util/Fonts";

interface HelpPageProps {
    title: string;
    content: string;
    onBackClicked: () => void;
}

export default class HelpPage extends ContainerObject {
    private static readonly theme = {
        fontSize: 14
    };

    constructor(props: HelpPageProps) {
        super();

        // const title = new StyledTextBuilder({
        //     fontFamily: Fonts.ARIAL,
        //     fontSize: theme.fontSize,
        //     fill: 0xffffff,
        //     wordWrap: true,
        //     wordWrapWidth: theme.width - 2 * UITheme.panel.padding
        // })
        //     .appendHTMLStyledText(TextUtil.processTags(pageText))
        //     .build();
    }
}
