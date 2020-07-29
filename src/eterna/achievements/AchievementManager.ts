import {
    GameObject, GameObjectRef, SerialTask, FunctionTask, CallbackTask, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import GameMode from 'eterna/mode/GameMode';
import AchievementBox from './AchievementBox';

export default class AchievementManager extends GameObject {
    /** True if there's an achievement animation playing, or about to play */
    public get hasPendingAchievements(): boolean {
        return this._cur.isLive || this._pending.length > 0;
    }

    /** Returns a new Promise that will resolve when there are no pending achievements to display */
    public achievementsCompleted(): Promise<void> {
        if (!this.hasPendingAchievements) {
            return Promise.resolve();
        } else {
            return new Promise<void>((resolve) => {
                this.addObject(new SerialTask(
                    new FunctionTask((): boolean => !this.hasPendingAchievements),
                    new CallbackTask(resolve)
                ));
            });
        }
    }

    public awardAchievements(achievementData: Map<string, AchievementData>): Promise<void> {
        if (achievementData != null) {
            for (let key of Object.keys(achievementData)) {
                if (Object.prototype.hasOwnProperty.call(achievementData, key)) {
                    let data: AchievementData | undefined = achievementData.get(key);
                    this._pending.push(data);
                }
            }

            this.maybeShowNextAchievement();
        }

        return this.achievementsCompleted();
    }

    private maybeShowNextAchievement(): void {
        if (this._pending.length === 0 || this._cur.isLive) {
            return;
        }

        (this.mode as GameMode).pushUILock('ShowAchievement');

        let nextData: AchievementData | undefined = this._pending.shift();
        if (nextData === undefined) {
            throw new Error('nextData was undefined!');
        }
        let view = new AchievementBox(nextData.image, nextData.past);
        this._cur = this.addObject(view, (this.mode as GameMode).achievementsLayer);

        view.animate();
        view.closed.connect(() => view.destroySelf());

        view.destroyed.connect(() => {
            this.maybeShowNextAchievement();
            (this.mode as GameMode).popUILock('ShowAchievement');
        });

        let updateLoc = () => {
            DisplayUtil.positionRelativeToStage(
                view.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER
            );
        };
        updateLoc();
        view.regs.add((this.mode as GameMode).resized.connect(updateLoc));
    }

    private _cur: GameObjectRef = GameObjectRef.NULL;
    private readonly _pending: (AchievementData | undefined)[] = [];
}

export interface AchievementData {
    level: number;
    image: string;
    desc: string;
    past: string;
}
