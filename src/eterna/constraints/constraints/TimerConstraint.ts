import {Container, Sprite, Texture} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface TimerConstraintStatus extends BaseConstraintStatus {
    timeRemaining: number;
}

export default class TimerConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'TIMERMIN';
    // SOFT constraints are intended to allow out-of-spec solutions. However,
    // this constraint is intended not as part of the spec, but as a limitation
    // of the puzzle solving process. Concretely, this constraint was built for user studies,
    // in which case we may not need the user to solve everything, but if they havent finished
    // their time yet, we can't solve
    public readonly hard: boolean = true;
    public readonly timeLimit: number;

    constructor(timeLimit: number) {
        super();
        this.timeLimit = timeLimit;
    }

    public evaluate(context: ConstraintContext): TimerConstraintStatus {
        const timeRemaining = Math.max(
            // In puzzlemaker, the elapsed time doesn't really make sense
            // in the current setup, as solving time is conflated with
            // design time. That said even if we un-conflated it to verify the
            // puzzle can be solved within the limit, it's liable to result in
            // realistically-unsolvable puzzles anyways (the player already knows the
            // solution so they can solve it much faster than a fresh solver), plus
            // a player might just save their results elsewhere and resume...
            // If we ever use this for time trials as opposed to just research
            // studies we'd need to think through all that.
            (this.timeLimit * 1000) - ((context.elapsed ?? 0)),
            0
        );

        return {
            satisfied: timeRemaining <= 0,
            timeRemaining
        };
    }

    public getConstraintBoxConfig(
        status: TimerConstraintStatus
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            drawBG: true,
            tooltip: ConstraintBox.createTextStyle().append(`You have ${this.timeLimit} seconds to complete this puzzle`),
            clarificationText: `${this.timeLimit} SECONDS`,
            statText: (status.timeRemaining / 1000).toFixed(0),
            icon: TimerConstraint._icon,
            // This isn't really something that needs to be "satisfied" perse,
            // so the outline/check indication is liable to be confusing.
            // When the time limit passes, calling code is responsible for
            // halting the puzzle and doing whatever is necessary
            satisfiedIndicators: false
        };
    }

    public serialize(): [string, string] {
        return [
            TimerConstraint.NAME,
            this.timeLimit.toString()
        ];
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const img = new Sprite(Texture.from(Bitmaps.ImgStopwatch, {resourceOptions: {scale: 2}}));
        img.scale.x = 0.4;
        img.scale.y = 0.4;
        icon.addChild(img);

        return TextureUtil.renderToTexture(icon);
    }
}
