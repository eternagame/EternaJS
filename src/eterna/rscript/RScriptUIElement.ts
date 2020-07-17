import {DisplayObject, Rectangle} from 'pixi.js';
import {GameObject, DisplayUtil} from 'flashbang';

export type RScriptUIElement = GameObject | DisplayObject | Rectangle;

export function GetRScriptUIElementBounds(element: RScriptUIElement | null): Rectangle | null {
    if (element instanceof GameObject) {
        return element.display != null
            ? new Rectangle(
                element.display.worldTransform.tx,
                element.display.worldTransform.ty,
                DisplayUtil.width(element.display),
                DisplayUtil.height(element.display)
            )
            : new Rectangle();
    } else if (element instanceof DisplayObject) {
        return new Rectangle(element.x, element.y, DisplayUtil.width(element), DisplayUtil.height(element));
    } else {
        return element;
    }
}

export enum RScriptUIElementID {
    TOGGLETARGET = 'TOGGLETARGET',
    TOGGLENATURAL = 'TOGGLENATURAL',
    ZOOMIN = 'ZOOMIN',
    ZOOMOUT = 'ZOOMOUT',
    RESET = 'RESET',
    UNDO = 'UNDO',
    REDO = 'REDO',
    SWAP = 'SWAP',
    HINT = 'HINT',
    PIP = 'PIP',
    FREEZE = 'FREEZE',
    SWITCH = 'SWITCH',
    BASEMARKER = 'BASEMARKER',
    MAGICGLUE = 'MAGICGLUE',

    OBJECTIVES = 'OBJECTIVES',
    OBJECTIVE = 'OBJECTIVE-',
    SHAPEOBJECTIVE = 'SHAPEOBJECTIVE',

    A = 'A',
    U = 'U',
    G = 'G',
    C = 'C',
    AU = 'AU',
    UA = 'UA',
    GU = 'GU',
    UG = 'UG',
    GC = 'GC',
    CG = 'CG',
    AUCOMPLETE = 'AUCOMPLETE',
    UACOMPLETE = 'UACOMPLETE',
    GUCOMPLETE = 'GUCOMPLETE',
    UGCOMPLETE = 'UGCOMPLETE',
    GCCOMPLETE = 'GCCOMPLETE',
    CGCOMPLETE = 'CGCOMPLETE',

    HELP = 'HELP',

    TOTALENERGY = 'TOTALENERGY',
    PRIMARY_ENERGY = 'PRIMARY_ENERGY',
    SECONDARY_ENERGY = 'SECONDARY_ENERGY',

    PALETTE = 'PALETTE',
    PALETTEALT = 'PALETTEALT',
    TOGGLEBAR = 'TOGGLEBAR',
    ACTIONBAR = 'ACTIONBAR',
    ACTION_MENU = 'ACTION_MENU',

    ENERGY = 'ENERGY',
    BASENUMBERING = 'BASENUMBERING'
}
