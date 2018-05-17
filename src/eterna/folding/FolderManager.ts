import {Eterna} from "../Eterna";
import {AutosaveManager} from "../util/AutosaveManager";
import {Folder} from "./Folder";
import {RNAFoldBasic} from "./RNAFoldBasic";
import {Vienna} from "./Vienna";

export class FolderManager {
    public static get instance(): FolderManager {
        if (FolderManager._instance == null) {
            FolderManager._instance = new FolderManager;
        }
        return FolderManager._instance;
    }

    public add_folder(folder: Folder): void {
        for (let other of this._folders) {
            if (other.get_folder_name() == folder.get_folder_name()) {
                throw new Error("Trying to generate folders with duplicate names ('" + folder.get_folder_name() + "')");
            }
        }
        this._folders.push(folder);
    }

    public get_folder(name: string): Folder {
        let folder: Folder;
        for (folder of this._folders) {
            if (folder.get_folder_name() == name) {
                return folder;
            }
        }

        throw new Error("Trying to query non-existing folder ('" + folder.get_folder_name() + "')");
    }

    public get_next_folder(folder_name: string, filter_cb: Function = null): Folder {
        let ii: number;
        for (ii = 0; ii < this._folders.length; ii++) {
            if (this._folders[ii].get_folder_name() == folder_name) {
                break;
            }
        }

        if (ii >= this._folders.length) {
            throw new Error("Folder '" + folder_name + "' doesn't exist");
        }

        let jj: number;
        for (jj = 1; jj < this._folders.length; jj++) {
            let idx: number = (ii + jj) % this._folders.length;
            let folder: Folder = this._folders[idx];

            if (folder.get_folder_name().length == 0 ||
                folder.get_folder_name() == RNAFoldBasic.NAME ||
                !folder.is_functional() ||
                (filter_cb != null && filter_cb(folder))) {
                continue;
            }

            AutosaveManager.saveObjects([folder.get_folder_name()], "folder-" + Eterna.player_id);
            return folder;
        }

        return this._folders[ii]; // use same one
    }

    public get_last_used_folder(): string {
        let pref: any[] = AutosaveManager.loadObjects("folder-" + Eterna.player_id);
        if (pref == null) {
            return Vienna.NAME;
        }
        return pref[0];
    }

    private _folders: Folder[] = [];
    private static _instance: FolderManager;
}
