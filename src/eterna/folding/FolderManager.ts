import Eterna from 'eterna/Eterna';
import Folder from './Folder';
import RNAFoldBasic from './RNAFoldBasic';
import Vienna from './Vienna';
import LinearFoldC from './LinearFoldC';

export default class FolderManager {
    public static get instance(): FolderManager {
        if (FolderManager._instance == null) {
            FolderManager._instance = new FolderManager();
        }
        return FolderManager._instance;
    }

    public addFolder(folder: Folder): void {
        for (let other of this._folders) {
            if (other.name === folder.name) {
                throw new Error(`Trying to generate folders with duplicate names ('${folder.name}')`);
            }
        }
        this._folders.push(folder);
    }

    public isFolder(name: string): boolean {
        for (let folder of this._folders) {
            if (folder.name.toLowerCase() === name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    public getFolder(name: string): Folder | null {
        for (let folder of this._folders) {
            if (folder.name.toLowerCase() === name.toLowerCase()) {
                return folder;
            }
        }

        return null;
    }

    public getNextFolder(folderName: string, filterCB: ((folder: Folder) => boolean) | null = null): Folder {
        let curFolderIdx = -1;
        for (let ii = 0; ii < this._folders.length; ii++) {
            if (this._folders[ii].name.toLowerCase() === folderName.toLowerCase()) {
                curFolderIdx = ii;
                break;
            }
        }

        if (curFolderIdx < 0) {
            throw new Error(`No such folder '${folderName}'`);
        }

        for (let jj = 1; jj < this._folders.length; jj++) {
            let idx: number = (curFolderIdx + jj) % this._folders.length;
            let folder: Folder = this._folders[idx];

            if (folder.name.length === 0
                || folder.name === RNAFoldBasic.NAME
                || !folder.isFunctional
                || (filterCB != null && filterCB(folder))) {
                continue;
            }

            Eterna.settings.lastUsedFolder.value = folder.name;
            return folder;
        }

        return this._folders[curFolderIdx]; // use same one
    }

    public getFolders(filterCB: ((folder: Folder) => boolean) | null = null): string[] {
        return this._folders.filter((folder) => folder.name.length !== 0
                && folder.name !== RNAFoldBasic.NAME
                && folder.isFunctional
                && (filterCB === null || filterCB(folder))).map((folder) => folder.name);
    }

    public get lastUsedFolder(): string {
        return Eterna.settings.lastUsedFolder.value || Vienna.NAME;
    }

    private _folders: Folder[] = [];
    private static _instance: FolderManager;
}
