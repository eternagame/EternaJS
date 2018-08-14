import {HAlign, VAlign} from "../../flashbang/core/Align";
import {GameObject} from "../../flashbang/core/GameObject";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {CallbackTask} from "../../flashbang/tasks/CallbackTask";
import {FunctionTask} from "../../flashbang/tasks/FunctionTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {GameMode} from "../mode/GameMode";
import {AchievementBox} from "./AchievementBox";

export class AchievementManager extends GameObject {
    /** True if there's an achievement animation playing, or about to play */
    public get hasPendingAchievements(): boolean {
        return this._cur.isLive || this._pending.length > 0;
    }

    /** Returns a new Promise that will resolve when there are no pending achievements to display */
    public achievementsCompleted(): Promise<void> {
        if (!this.hasPendingAchievements) {
            return Promise.resolve();
        } else {
            return new Promise<void>(resolve => {
                this.addObject(new SerialTask(
                    new FunctionTask((): boolean => !this.hasPendingAchievements),
                    new CallbackTask(resolve),
                ));
            });
        }
    }

    public award_achievement(achievementData: any): Promise<void> {
        if (achievementData != null) {
            for (let key in achievementData) {
                if (achievementData.hasOwnProperty(key)) {
                    let data: AchievementData = achievementData[key];
                    this._pending.push(data);
                }
            }

            this.maybeShowNextAchievement();
        }

        return this.achievementsCompleted();
    }

    private maybeShowNextAchievement(): void {
        if (this._pending.length == 0 || this._cur.isLive) {
            return;
        }

        (this.mode as GameMode).pushUILock();

        let nextData: AchievementData = this._pending.shift();
        let view = new AchievementBox(nextData.image, nextData.past);
        this._cur = this.addObject(view, (this.mode as GameMode).achievementsLayer);

        view.animate();
        view.okButton.clicked.connect(() => view.destroySelf());

        view.destroyed.connect(() => {
            this.maybeShowNextAchievement();
            (this.mode as GameMode).popUILock();
        });

        let updateLoc = () => {
            DisplayUtil.positionRelativeToStage(
                view.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER);
        };
        updateLoc();
        view.regs.add(this.mode.resized.connect(updateLoc));
    }

    private _cur: GameObjectRef = GameObjectRef.NULL;
    private readonly _pending: AchievementData[] = [];
}

interface AchievementData {
    level: number;
    image: string;
    desc: string;
    past: string;
}
