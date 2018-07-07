import * as log from "loglevel";

export class AchievementManager {
    public static award_achievement(achievements: any): Promise<void> {
        log.debug("TODO: award_achievement");
        return Promise.resolve();
        // if (achievements == null) {
        //     return;
        // }
        //
        // let count: number = 0;
        // let key: string;
        //
        // for (key in achievements) {
        //     count++;
        // }
        //
        // if (count == 0) {
        //     return;
        // }
        //
        // let achs: Achievements = new Achievements();
        // let modal: GameObject = Application.instance.get_modal_container();
        // modal.add_object(achs);
        //
        // for (key in achievements) {
        //     let cheev: Object = achievements[key];
        //     achs.put(cheev['level'], cheev['image'], cheev['desc'], cheev['past']);
        // }
        //
        // Application.instance.add_lock("ACHIEVEMENTS");
        //
        // achs.execute_animation(function (): void {
        //     modal.remove_object(achs);
        //     Application.instance.remove_lock("ACHIEVEMENTS");
        //     if (cb != null) {
        //         cb();
        //     }
        // });
    }

}
