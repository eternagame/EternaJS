import * as log from "loglevel";
import {AppMode} from "../../flashbang/core/AppMode";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Pose2D} from "../pose2D/Pose2D";
import {BitmapManager} from "../util/BitmapManager";

export class PoseTestMode extends AppMode {
    protected setup(): void {
        super.setup();
        log.info("Loading Pose2D resources...");
        TextureUtil.load(BitmapManager.pose2DURLs)
            .then(() => {
                log.info("Pose2D resources loaded");
                this.onResourcesLoaded();
            });
    }

    protected onResourcesLoaded(): void {
        this._pose = new Pose2D(true);
        this.addObject(this._pose);

        this._pose.set_sequence(PoseTestMode.SEQ);
        this._pose.set_oligos(PoseTestMode.OLIGOS);
        this._pose.set_oligo(PoseTestMode.OLIGO);
        this._pose.set_pairs(PoseTestMode.PAIRS);
        this._pose.set_struct_constraints(PoseTestMode.STRUCT_CONSTRAINTS);
        this._pose.set_puzzle_locks(PoseTestMode.PUZLOCKS);
        this._pose.set_shift_limit(PoseTestMode.SHIFT_LIMIT);
    }

    private _pose: Pose2D;

    private static readonly SEQ: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    private static readonly OLIGOS: number[] = null;
    private static readonly OLIGO: number[] = null;
    private static readonly PAIRS: number[] = [13, 12, 11, -1, -1, -1, -1, -1, -1, -1, -1, 2, 1, 0];
    private static readonly STRUCT_CONSTRAINTS: boolean[] = null;
    private static readonly PUZLOCKS: boolean[] = [false, false, false, false, false, false, false, false, false, false, false, false, false, false];
    private static readonly SHIFT_LIMIT: number = 5;
}
