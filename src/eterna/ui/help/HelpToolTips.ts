import {
    Graphics, Container, TextMetrics
} from 'pixi.js';
import TextUtil from 'eterna/util/TextUtil';
import Fonts from 'eterna/util/Fonts';
import HelpToolTip, {ToolTipPositioner} from './HelpToolTip';

export interface HelpToolTipsProps {
    topbarHelpers: ToolTipPositioner[];
    palette?: ToolTipPositioner;
    hints?: ToolTipPositioner;
    switchState?: ToolTipPositioner;
    modeSwitch?: ToolTipPositioner;
}
export default class HelpToolTips {
    public static create(props: HelpToolTipsProps) {
        const tailLength = 57;
        const toolTips:(HelpToolTip|null)[] = [];
        const fixedToolTips = [
            props.modeSwitch
                ? new HelpToolTip({text: 'Natural/Target Mode', positioner: props.modeSwitch})
                : null,

            props.palette
                ? new HelpToolTip({
                    text: 'Base Palette',
                    tailLength,
                    positioner: props.palette,
                    content: (() => {
                        const elemW = 75;
                        const elemH = 18;
                        const separation = 2;
                        const makeRect = (x: number, y: number, color: number) => {
                            const rect = new Graphics();
                            rect.beginFill(color);
                            rect.drawRect(0, 0, elemW, elemH);
                            rect.endFill();
                            rect.position.set(x, y);
                            return rect;
                        };

                        const makeText = (text: string) => {
                            const builder = Fonts.std(text).color(0);
                            const metrics = TextMetrics.measureText(text, builder.style);
                            const textElem = builder.build();
                            textElem.position.set(
                                (elemW - metrics.width) / 2,
                                (elemH - metrics.height) / 2
                            );
                            return textElem;
                        };

                        const adenine = makeRect(0, 0, TextUtil.STD_YELLOW_COLOR);
                        adenine.addChild(makeText('Adenine'));
                        const guanine = makeRect(elemW + separation, 0, TextUtil.STD_RED_COLOR);
                        guanine.addChild(makeText('Guanine'));
                        const uracil = makeRect(0, elemH + separation, TextUtil.STD_BLUE_COLOR);
                        uracil.addChild(makeText('Uracil'));
                        const cytosine = makeRect(elemW + separation, elemH + separation, TextUtil.STD_GREEN_COLOR);
                        cytosine.addChild(makeText('Cytosine'));

                        const content = new Container();
                        content.addChild(adenine);
                        content.addChild(guanine);
                        content.addChild(uracil);
                        content.addChild(cytosine);
                        content.width = elemW * 2 + separation;
                        content.height = elemH * 2 + separation;
                        return content;
                    })()
                })
                : null,

            props.hints
                ? new HelpToolTip({text: 'Hints On/Off', side: 'bottom', positioner: props.hints})
                : null,

            props.switchState
                ? new HelpToolTip({text: 'Switch state', side: 'bottom', positioner: props.switchState})
                : null

        ];
        fixedToolTips.forEach((tip) => {
            toolTips.push(tip);
        });

        let tailBodyHeight = 2 * HelpToolTip.theme.vPadding;
        tailBodyHeight += HelpToolTip.theme.fontSize;
        tailBodyHeight += 4;
        props.topbarHelpers.forEach((p, k) => {
            const [, , name] = p;
            toolTips.push(new HelpToolTip({text: name, tailLength: tailBodyHeight * (k % 2), positioner: p}));
        });
        return toolTips.filter((toolTip): toolTip is HelpToolTip => toolTip != null);
    }
}
