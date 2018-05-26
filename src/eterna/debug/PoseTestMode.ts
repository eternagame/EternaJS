import * as log from "loglevel";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {KeyboardEventType} from "../../flashbang/input/KeyboardEventType";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Background} from "../Background";
import {Pose2D} from "../pose2D/Pose2D";
import {BitmapManager} from "../util/BitmapManager";

export class PoseTestMode extends AppMode {
    protected setup(): void {
        super.setup();

        this.addObject(new Background(), this.modeSprite);

        log.info("Loading Pose2D resources...");
        TextureUtil.load(BitmapManager.pose2DURLs)
            .then(() => {
                log.info("Pose2D resources loaded");
                this.onResourcesLoaded();
            });
    }

    protected onResourcesLoaded(): void {
        this._pose = this.createPose(PoseTestMode.PUZZLE_4350940);
        this._pose.display.x = Flashbang.stageWidth * 0.5;
        this._pose.display.y = Flashbang.stageHeight * 0.5;
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        if (e.type != KeyboardEventType.KEY_DOWN) {
            return;
        }

        switch (e.code) {
        case KeyCode.KeyL:
            this._pose.set_lettermode(!this._pose.is_lettermode());
            break;

        case KeyCode.KeyN:
            this._pose.set_show_numbering(!this._pose.is_showing_numbering());
            break;
        }
    }

    public onMouseWheelEvent(e :WheelEvent): void {
        let prev_zoom: number = this._pose.get_zoom_level();

        if (e.deltaY < 0 && prev_zoom > 0) {
            // zoom in
            this._pose.set_zoom_level(prev_zoom - 1);
        } else if (e.deltaY > 0 && prev_zoom < Pose2D.ZOOM_SPACINGS.length - 1) {
            // zoom out
            this._pose.set_zoom_level(prev_zoom + 1);
        }
    }

    private createPose(desc: PoseDesc): Pose2D {
        let pose: Pose2D = new Pose2D(true);
        this.addObject(pose, this.modeSprite);

        pose.set_sequence(desc.seq);
        pose.set_oligos(desc.oligos);
        pose.set_oligo(desc.oligo);
        pose.set_pairs(desc.pairs);
        pose.set_struct_constraints(desc.structConstraints);
        pose.set_puzzle_locks(desc.puzlocks);
        pose.set_shift_limit(desc.shiftLimit || 0);

        return pose;
    }

    private _pose: Pose2D;

    private static readonly TINY_POSE: PoseDesc = {
        seq: [1, 1, 1],
        pairs: [-1, -1, -1],
        puzlocks: [false, false, false]
    };

    private static readonly PUZZLE_4350940: PoseDesc = {
        seq: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        pairs: [13, 12, 11, -1, -1, -1, -1, -1, -1, -1, -1, 2, 1, 0],
        puzlocks: [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        shiftLimit: 5
    };
}

interface PoseDesc {
    seq: number[];
    oligos?: number[];
    oligo?: number[];
    pairs: number[];
    structConstraints?: boolean[];
    puzlocks: boolean[];
    shiftLimit?: number;
}
