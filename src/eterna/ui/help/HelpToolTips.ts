import {Point, Graphics, Container} from 'pixi.js';
import TextUtil from 'eterna/util/TextUtil';
import Fonts from 'eterna/util/Fonts';
import HelpToolTip from './HelpToolTip';

export interface HelpToolTipsProps {
    hints: boolean;
    swapPairs: boolean;
    modeSwitch: boolean;
    pip: boolean;
    switchState: boolean;
}

export default class HelpToolTips {
    public static create(props: HelpToolTipsProps) {
        const toolBarY = -73;
        const tailLength = 57;
        const bottomCenter = new Point(0.5, 1);

        const offsets = (() => {
            if (props.pip) {
                return {
                    menu: new Point(-348, toolBarY),
                    pip: new Point(-259, toolBarY),
                    modeSwitch: new Point(-170, toolBarY),
                    palette: new Point(8, toolBarY),
                    swapPairs: new Point(138, toolBarY),
                    zoom: new Point(240, toolBarY),
                    undo: new Point(358, toolBarY)
                };
            } else {
                return {
                    menu: new Point(-316, toolBarY),
                    modeSwitch: new Point(-200, toolBarY),
                    palette: new Point(-22, toolBarY),
                    swapPairs: new Point(110, toolBarY),
                    zoom: new Point(213, toolBarY),
                    undo: new Point(330, toolBarY)
                };
            }
        })();

        return [
            [new HelpToolTip({text: 'MENU', tailLength}), bottomCenter, offsets.menu],

            props.modeSwitch
                ? [new HelpToolTip({text: 'NATURAL/TARGET MODE'}), bottomCenter, offsets.modeSwitch]
                : null,

            props.pip
                ? [new HelpToolTip({text: 'Pip MODE', tailLength}), bottomCenter, offsets.pip]
                : null,

            [
                new HelpToolTip({
                    text: 'BASE PALETTE',
                    tailLength,
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
                            const builder = Fonts.stdRegular(text).color(0);
                            const metrics = PIXI.TextMetrics.measureText(text, builder.style);
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
                }),
                bottomCenter,
                offsets.palette
            ],

            props.swapPairs
                ? [new HelpToolTip({text: 'SWAP PAIR'}), bottomCenter, offsets.swapPairs]
                : null,

            [new HelpToolTip({text: 'ZOOM IN/OUT', tailLength}), bottomCenter, offsets.zoom],
            [new HelpToolTip({text: 'UNDO/REDO'}), bottomCenter, offsets.undo],

            props.hints
                ? [new HelpToolTip({text: 'HINTS ON/OFF', side: 'bottom'}), new Point(1, 0), new Point(-94, 55)]
                : null,

            props.switchState
                ? [new HelpToolTip({text: 'SWITCH STATE', side: 'bottom'}), new Point(0.5, 0), new Point(22, 55)]
                : null

        ].filter(Boolean) as Array<[HelpToolTip, Point, Point]>;
    }
}
