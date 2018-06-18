import {Value} from "../../signals/Value";
import {Button} from "./Button";

/** A two-state Button whose value is toggled on click (e.g. a checkbox). */
export abstract class ToggleButton extends Button {
    public readonly toggled: Value<boolean> = new Value(false);

    protected constructor() {
        super();

        this.toggled.connect((toggled: boolean) => this.onToggledChanged(toggled));

        this.clicked.connect(() => {
            if (this.enabled) {
                this.toggle();
            }
        });
    }

    public toggle(): void {
        this.toggled.value = !this.toggled.value;
    }

    protected onToggledChanged(toggled: boolean): void {
        this.showState(this._state);
    }
}
