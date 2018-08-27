import {Text} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {ObjectTask} from "../../flashbang/core/ObjectTask";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DelayTask} from "../../flashbang/tasks/DelayTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {ScaleTask} from "../../flashbang/tasks/ScaleTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Easing} from "../../flashbang/util/Easing";
import {Fonts} from "../util/Fonts";

/** Displays a simple animation while we're loading assets */
export class LoadingMode extends AppMode {
    public constructor(text: string) {
        super();
        this._text = text;
    }

    public get text(): string {
        return this._text;
    }

    public set text(value: string) {
        if (this._text !== value) {
            this._text = value;
            if (this._textField != null) {
                this._textField.text = value;
                this._textField.x = -this._textField.width * 0.5;
                this._textField.y = -this._textField.height * 0.5;
            }
        }
    }

    protected setup(): void {
        super.setup();

        this._textField = Fonts.arial(this._text, 36).bold().color(0xffffff).build();
        this._textField.x = -this._textField.width * 0.5;
        this._textField.y = -this._textField.height * 0.5;

        let container = new ContainerObject();
        container.container.addChild(this._textField);
        this.addObject(container, this.container);

        container.addObject(new SerialTask(
            new DelayTask(0.5),
            new RepeatingTask((): ObjectTask => new SerialTask(
                new ScaleTask(0.9, 0.9, 1, Easing.easeInOut),
                new ScaleTask(1, 1, 1, Easing.easeInOut)
            ))
        ));

        let updateLoc = () => {
            container.display.x = Flashbang.stageWidth * 0.5;
            container.display.y = Flashbang.stageHeight * 0.5;
        };
        updateLoc();
        this.resized.connect(updateLoc);
    }

    private _text: string;
    private _textField: Text;
}
