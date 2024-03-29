import {DisplayObject, Rectangle} from 'pixi.js';
import {GameObject} from 'flashbang';

export type RSScriptRectangle = {
    rect: Rectangle;
    proxy?: boolean;
};
export type RScriptUIElement = GameObject | DisplayObject | RSScriptRectangle;

export enum RScriptUIElementID {
    TOGGLETARGET = 'TOGGLETARGET',
    TOGGLENATURAL = 'TOGGLENATURAL',
    SWITCH = 'SWITCH',
    FOLDER = 'FOLDER',

    ZOOMIN = 'ZOOMIN',
    ZOOMOUT = 'ZOOMOUT',
    RESET = 'RESET',
    UNDO = 'UNDO',
    REDO = 'REDO',
    BOOSTERS = 'BOOSTERS',
    SWAP = 'SWAP',
    PIP = 'PIP',
    FREEZE = 'FREEZE',
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

    HINT = 'HINT',
    HELP = 'HELP',

    TOTALENERGY = 'TOTALENERGY',
    PRIMARY_ENERGY = 'PRIMARY_ENERGY',
    SECONDARY_ENERGY = 'SECONDARY_ENERGY',
    DELTAENERGY = 'DELTAENERGY',

    PALETTE = 'PALETTE',
    PALETTEALT = 'PALETTEALT',
    TOGGLEBAR = 'TOGGLEBAR',
    ACTION_MENU = 'ACTION_MENU',

    ENERGY = 'ENERGY',
    BASENUMBERING = 'BASENUMBERING',
    BASELETTERING = 'BASELETTERING'
}
