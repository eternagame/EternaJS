import {
    Point, Graphics, Container, TextMetrics
} from 'pixi.js';
import TextUtil from 'eterna/util/TextUtil';
import Fonts from 'eterna/util/Fonts';
import HelpToolTip, {ToolTipPositioner} from './HelpToolTip';

export interface HelpToolTipsProps {
    menu: ToolTipPositioner;
    palette?: ToolTipPositioner;
    zoom?: ToolTipPositioner;
    undo?: ToolTipPositioner;
    hints?: ToolTipPositioner;
    swapPairs?: ToolTipPositioner;
    switchState?: ToolTipPositioner;
    modeSwitch?: ToolTipPositioner;
    pip?: ToolTipPositioner;
    submit?: ToolTipPositioner;
}

export default class HelpToolTips {
    public static create(props: HelpToolTipsProps) {
        const tailLength = 57;
        return [
            new HelpToolTip({text: 'MENU', tailLength, positioner: props.menu}),

            props.submit
                ? new HelpToolTip({text: 'SUBMIT', positioner: props.submit})
                : null,

            props.modeSwitch
                ? new HelpToolTip({text: 'NATURAL/TARGET MODE', positioner: props.modeSwitch})
                : null,

            props.pip
                ? new HelpToolTip({text: 'PiP MODE', tailLength, positioner: props.pip})
                : null,

            props.palette
                ? new HelpToolTip({
                    text: 'BASE PALETTE',
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
                            rect.position = new Point(x, y);
                            return rect;
                        };

                        const makeText = (text: string) => {
                            const builder = Fonts.std(text).color(0);
                            const metrics = TextMetrics.measureText(text, builder.style);
                            const textElem = builder.build();
                            textElem.position = new Point(
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

            props.swapPairs
                ? new HelpToolTip({text: 'SWAP PAIR', positioner: props.swapPairs})
                : null,

            props.zoom
                ? new HelpToolTip({text: 'ZOOM IN/OUT', tailLength, positioner: props.zoom})
                : null,

            props.undo
                ? new HelpToolTip({text: 'UNDO/REDO', positioner: props.undo})
                : null,

            props.hints
                ? new HelpToolTip({text: 'HINTS ON/OFF', side: 'bottom', positioner: props.hints})
                : null,

            props.switchState
                ? new HelpToolTip({text: 'SWITCH STATE', side: 'bottom', positioner: props.switchState})
                : null

        ].filter((toolTip): toolTip is HelpToolTip => toolTip != null);
    }
}
