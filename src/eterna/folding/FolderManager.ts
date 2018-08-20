import {Eterna} from "../Eterna";
import {Folder} from "./Folder";
import {RNAFoldBasic} from "./RNAFoldBasic";
import {Vienna} from "./Vienna";

export class FolderManager {
    public static get instance(): FolderManager {
        if (FolderManager._instance == null) {
            FolderManager._instance = new FolderManager();
        }
        return FolderManager._instance;
    }

    public add_folder(folder: Folder): void {
        for (let other of this._folders) {
            if (other.get_folder_name() === folder.get_folder_name()) {
                throw new Error(`Trying to generate folders with duplicate names ('${folder.get_folder_name()}')`);
            }
        }
        this._folders.push(folder);
    }

    public isFolder(name: string): boolean {
        for (let folder of this._folders) {
            if (folder.get_folder_name() == name) {
                return true;
            }
        }
        return false;
    }

    public get_folder(name: string): Folder {
        for (let folder of this._folders) {
            if (folder.get_folder_name() === name) {
                return folder;
            }
        }

        throw new Error(`No such folder '${name}'`);
    }

    public get_next_folder(folder_name: string, filter_cb: Function = null): Folder {
        let curFolderIdx: number = -1;
        for (let ii = 0; ii < this._folders.length; ii++) {
            if (this._folders[ii].get_folder_name() === folder_name) {
                curFolderIdx = ii;
                break;
            }
        }

        if (curFolderIdx < 0) {
            throw new Error(`No such folder '${folder_name}'`);
        }

        for (let jj = 1; jj < this._folders.length; jj++) {
            let idx: number = (curFolderIdx + jj) % this._folders.length;
            let folder: Folder = this._folders[idx];

            if (folder.get_folder_name().length === 0
                || folder.get_folder_name() === RNAFoldBasic.NAME
                || !folder.is_functional()
                || (filter_cb != null && filter_cb(folder))) {
                continue;
            }

            Eterna.settings.lastUsedFolder.value = folder.get_folder_name();
            return folder;
        }

        return this._folders[curFolderIdx]; // use same one
    }

    public get_last_used_folder(): string {
        return Eterna.settings.lastUsedFolder.value || Vienna.NAME;
    }

    private _folders: Folder[] = [];
    private static _instance: FolderManager;
}
