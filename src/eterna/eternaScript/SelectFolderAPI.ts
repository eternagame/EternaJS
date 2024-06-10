import {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';

/**
 * Adds the ability to modify the folder (via its name) to the EternaScript API.
*/
export default function addSelectFolderAPIToInterface({selectFolder, scriptInterface}: {
    selectFolder: (folderName: string) => boolean,
    scriptInterface: ExternalInterfaceCtx,
}) {
    scriptInterface.addCallback(
        'select_folder', (folderName: string): boolean => selectFolder(folderName)
    );
}
