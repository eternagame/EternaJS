import * as log from "loglevel";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";

export class PuzzleEvent extends ContainerObject {
    public static PUZEVENT_TRANSIT_TO: number = 0;
    public static PUZEVENT_SET_PALLETE: number = 1;
    public static PUZEVENT_STUCK_ON_TARGET: number = 2;
    public static PUZEVENT_ENDING: number = 3;
    public static PUZEVENT_TEMP_CLEARED: number = 4;
    public static PUZEVENT_MODE_CHANGE: number = 5;
    public static BROWSEEVENT_LAB_FIRST_VISIT: number = 6;
    public static PUZEVENT_ON_POSE_CHANGE: number = 7;

    public static add_group(events: string[], grp_name: string, grp_trigger: string): void {
        log.debug("PuzzleEvent.add_group");
    }

    public static add_action(events: string[], grp_name: string, pos: string, txt: string, action: string, center: string = "", fontsize: number = 20, fontcolor: number = 0xFFFFFF): void {
        log.debug("PuzzleEvent.add_action");
    }

    public is_event_running(): boolean {
        return false;
    }

    public set_events(events: string[], get_pos_callback: Function, run_action_callback: Function): void {
        log.debug("PuzzleEvent.setEvents");
    }

    public process_events(states: Map<any, any>): void {
        log.debug("PuzzleEvent.process_events");
    }
}
