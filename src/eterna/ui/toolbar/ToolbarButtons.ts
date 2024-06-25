import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import {KeyCode} from 'flashbang';
import {ButtonCategory, ToolbarParam} from './ToolbarButton';

const MODE_COLOR = 0x043468;
const MODE_TOGGLE_COLOR = 0xBEDCE8;

// ===== MODES =====

export const naturalButtonProps: ToolbarParam = {
    color: {color: MODE_COLOR, alpha: 1},
    toggleColor: {color: MODE_TOGGLE_COLOR, alpha: 1},
    cat: ButtonCategory.NONE,
    id: 'naturalStructureMode',
    displayName: 'Natural Mode',
    allImg: Bitmaps.ImgNatural,
    overImg: Bitmaps.ImgOverNatural,
    disableImg: Bitmaps.ImgGreyNatural,
    selectedImg: Bitmaps.ImgSelectedNatural,
    tooltip: 'Natural Mode. RNA folds into the most stable shape (Space)',
    rscriptID: RScriptUIElementID.TOGGLENATURAL
};

export const estimateButtonProps: ToolbarParam = {
    color: {color: MODE_COLOR, alpha: 1},
    toggleColor: {color: MODE_TOGGLE_COLOR, alpha: 1},
    cat: ButtonCategory.NONE,
    id: 'estimateStructureMode',
    displayName: 'Estimate Mode',
    allImg: Bitmaps.ImgEstimate,
    overImg: Bitmaps.ImgOverEstimate,
    disableImg: Bitmaps.ImgGreyEstimate,
    selectedImg: Bitmaps.ImgSelectedEstimate,
    tooltip: 'Estimate Mode. The game approximates how the RNA actually folded in a test tube (Space)'
};

export const targetButtonProps: ToolbarParam = {
    color: {color: MODE_COLOR, alpha: 1},
    toggleColor: {color: MODE_TOGGLE_COLOR, alpha: 1},
    cat: ButtonCategory.NONE,
    id: 'targetStructureMode',
    displayName: 'Target Mode',
    allImg: Bitmaps.ImgTarget,
    overImg: Bitmaps.ImgOverTarget,
    disableImg: Bitmaps.ImgGreyTarget,
    selectedImg: Bitmaps.ImgSelectedTarget,
    tooltip: 'Target Mode. RNA freezes into the desired shape (Space)',
    rscriptID: RScriptUIElementID.TOGGLETARGET
};

export const baseColorButtonProps: ToolbarParam = {
    color: {color: MODE_COLOR, alpha: 1},
    toggleColor: {color: MODE_TOGGLE_COLOR, alpha: 1},
    cat: ButtonCategory.VIEW,
    id: 'baseColorMode',
    displayName: 'Base Colors',
    allImg: Bitmaps.ImgLetterColor,
    overImg: Bitmaps.ImgOverLetterColor,
    disableImg: Bitmaps.ImgGreyLetterColor,
    selectedImg: Bitmaps.ImgSelectedLetterColor,
    tooltip: 'Color sequences based on base colors as in the game'
};

export const expColorButtonProps: ToolbarParam = {
    color: {color: MODE_COLOR, alpha: 1},
    toggleColor: {color: MODE_TOGGLE_COLOR, alpha: 1},
    cat: ButtonCategory.VIEW,
    id: 'expColorMode',
    displayName: 'Experimental Data Colors',
    allImg: Bitmaps.ImgExpColor,
    overImg: Bitmaps.ImgOverExpColor,
    disableImg: Bitmaps.ImgGreyExpColor,
    selectedImg: Bitmaps.ImgSelectedExpColor,
    tooltip: 'Color sequences based on experimental data'
};

// ===== INFO =====

export const viewSolutionsButtonProps: ToolbarParam = {
    cat: ButtonCategory.INFO,
    id: 'solutions',
    displayName: 'View Solutions',
    allImg: Bitmaps.ImgViewSolutions,
    overImg: Bitmaps.ImgOverViewSolutions,
    disableImg: Bitmaps.ImgGreyViewSolutions,
    tooltip: 'View all submitted designs for this puzzle'
};

export const specButtonProps: ToolbarParam = {
    cat: ButtonCategory.INFO,
    id: 'spec',
    displayName: 'RNA Specs',
    allImg: Bitmaps.ImgSpec,
    overImg: Bitmaps.ImgOverSpec,
    disableImg: Bitmaps.ImgGreySpec,
    tooltip: "View RNA's melting point, dotplot and other specs (S)",
    hotKey: KeyCode.KeyS
};

export const submitSolutionButtonProps: ToolbarParam = {
    cat: ButtonCategory.INFO,
    id: 'submitSolution',
    displayName: 'Submit Solution',
    allImg: Bitmaps.ImgSubmit,
    overImg: Bitmaps.ImgOverSubmit,
    disableImg: Bitmaps.ImgGreySubmit,
    tooltip: 'Publish your solution'
};

export const submitPuzzleButtonProps: ToolbarParam = {
    cat: ButtonCategory.INFO,
    id: 'submitPuzzle',
    displayName: 'Submit Puzzle',
    allImg: Bitmaps.ImgSubmit,
    overImg: Bitmaps.ImgOverSubmit,
    disableImg: Bitmaps.ImgGreySubmit,
    tooltip: 'Publish your puzzle'
};

export const settingsButtonProps: ToolbarParam = {
    cat: ButtonCategory.INFO,
    id: 'settings',
    displayName: 'Settings',
    allImg: Bitmaps.ImgSettings,
    overImg: Bitmaps.ImgOverSettings,
    disableImg: Bitmaps.ImgGreySettings,
    tooltip: 'Game options'
};

// ===== CREATE =====

export const addBaseButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'addBase',
    displayName: 'Add Base',
    isPaintTool: true,
    allImg: Bitmaps.ImgAddBase,
    overImg: Bitmaps.ImgOverAddBase,
    disableImg: Bitmaps.ImgGreyAddBase,
    tooltip: 'Add a single base (6)',
    hotKey: KeyCode.Digit6
};

export const addPairButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'addPair',
    displayName: 'Add Pair',
    isPaintTool: true,
    allImg: Bitmaps.ImgAddPair,
    overImg: Bitmaps.ImgOverAddPair,
    disableImg: Bitmaps.ImgGreyAddPair,
    tooltip: 'Add a pair (7)',
    hotKey: KeyCode.Digit7
};

export const deleteButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'delete',
    displayName: 'Delete Base/Pair',
    isPaintTool: true,
    allImg: Bitmaps.ImgDelete,
    overImg: Bitmaps.ImgOverDelete,
    disableImg: Bitmaps.ImgGreyDelete,
    tooltip: 'Delete a base or a pair (8)',
    hotKey: KeyCode.Digit8
};

export const lockButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'lock',
    displayName: 'Lock/Unlock Base',
    isPaintTool: true,
    allImg: Bitmaps.ImgLock,
    overImg: Bitmaps.ImgOverLock,
    disableImg: Bitmaps.ImgGreyLock,
    tooltip: 'Lock or unlock a base (9)',
    hotKey: KeyCode.Digit9
};

export const moleculeButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'molecule',
    displayName: 'Add/Remove Molecule',
    isPaintTool: true,
    allImg: Bitmaps.ImgMolecule,
    overImg: Bitmaps.ImgOverMolecule,
    disableImg: Bitmaps.ImgGreyMolecule,
    tooltip: 'Create or remove a molecular binding site (0)',
    hotKey: KeyCode.Digit0
};

export const upload3DButtonProps: ToolbarParam = {
    cat: ButtonCategory.CREATE,
    id: 'upload3D',
    displayName: 'Upload 3D Model',
    allImg: Bitmaps.ImgUpload3D,
    overImg: Bitmaps.ImgOverUpload3D,
    disableImg: Bitmaps.ImgGreyUpload3D,
    tooltip: 'Upload 3D Model'
};

// ===== SOLVE =====

export const freezeButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'freeze',
    displayName: 'Freeze',
    allImg: Bitmaps.ImgFreeze,
    overImg: Bitmaps.ImgOverFreeze,
    disableImg: Bitmaps.ImgGreyFreeze,
    tooltip: 'Frozen mode. Suspends/resumes folding engine calculations (F)',
    hotKey: KeyCode.KeyF,
    rscriptID: RScriptUIElementID.FREEZE
};

export const resetButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'reset',
    displayName: 'Reset',
    allImg: Bitmaps.ImgReset,
    overImg: Bitmaps.ImgOverReset,
    disableImg: Bitmaps.ImgGreyReset,
    tooltip: 'Reset',
    rscriptID: RScriptUIElementID.RESET
};

export const baseShiftButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'shiftBase',
    displayName: 'Base Shift',
    // TODO: Verify this once implemented
    isPaintTool: true,
    allImg: Bitmaps.ImgBaseShift,
    overImg: Bitmaps.ImgOverBaseShift,
    disableImg: Bitmaps.ImgGreyBaseShift,
    tooltip: 'Base shift'
};

export const pairSwapButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'swapPair',
    displayName: 'Swap',
    isPaintTool: true,
    allImg: Bitmaps.ImgPairSwap,
    overImg: Bitmaps.ImgOverPairSwap,
    disableImg: Bitmaps.ImgGreyPairSwap,
    tooltip: 'Swap paired bases',
    rscriptID: RScriptUIElementID.SWAP,
    hotKey: KeyCode.Digit5
};

export const undoButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'undo',
    displayName: 'Undo',
    allImg: Bitmaps.ImgUndo,
    overImg: Bitmaps.ImgOverUndo,
    disableImg: Bitmaps.ImgGreyUndo,
    tooltip: 'Undo (Z)',
    hotKey: KeyCode.KeyZ,
    rscriptID: RScriptUIElementID.UNDO
};

export const redoButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'redo',
    displayName: 'Redo',
    allImg: Bitmaps.ImgRedo,
    overImg: Bitmaps.ImgOverRedo,
    disableImg: Bitmaps.ImgGreyRedo,
    tooltip: 'Redo (Y)',
    hotKey: KeyCode.KeyY,
    rscriptID: RScriptUIElementID.REDO
};

export const librarySelectionButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'randomizeBases',
    displayName: 'Randomize',
    isPaintTool: true,
    allImg: Bitmaps.ImgLibrarySelection,
    overImg: Bitmaps.ImgOverLibrarySelection,
    disableImg: Bitmaps.ImgGreyLibrarySelection,
    tooltip: 'Select bases to randomize'
};

export const magicGlueButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'magicGlue',
    displayName: 'Magic Glue',
    isPaintTool: true,
    allImg: Bitmaps.ImgMagicGlue,
    overImg: Bitmaps.ImgOverMagicGlue,
    disableImg: Bitmaps.ImgGreyMagicGlue,
    tooltip: 'Magic glue - change target structure in purple areas (Hold Alt)'
};

export const boostersMenuButtonProps: ToolbarParam = {
    cat: ButtonCategory.SOLVE,
    id: 'boosters',
    displayName: 'Boosters',
    allImg: Bitmaps.ImgBoosters,
    overImg: Bitmaps.ImgOverBoosters,
    disableImg: Bitmaps.ImgGreyBoosters,
    tooltip: 'Boosters',
    rscriptID: RScriptUIElementID.BOOSTERS
};

// ===== IMPORT/EXPORT =====

export const copyButtonProps: ToolbarParam = {
    cat: ButtonCategory.IMPORT_EXPORT,
    id: 'copy',
    displayName: 'Copy',
    allImg: Bitmaps.ImgCopy,
    overImg: Bitmaps.ImgOverCopy,
    disableImg: Bitmaps.ImgGreyCopy,
    tooltip: 'Copy the current sequence'
};

export const pasteButtonProps: ToolbarParam = {
    cat: ButtonCategory.IMPORT_EXPORT,
    id: 'paste',
    displayName: 'Paste',
    allImg: Bitmaps.ImgPaste,
    overImg: Bitmaps.ImgOverPaste,
    disableImg: Bitmaps.ImgGreyPaste,
    tooltip: 'Paste a sequence'
};

export const downloadSVGButtonProps: ToolbarParam = {
    cat: ButtonCategory.IMPORT_EXPORT,
    id: 'downloadSvg',
    displayName: 'Download SVG',
    allImg: Bitmaps.ImgDownloadSVG,
    overImg: Bitmaps.ImgOverDownloadSVG,
    disableImg: Bitmaps.ImgGreyDownloadSVG,
    tooltip: 'Download an SVG of the current custom layout'
};

export const screenshotButtonProps: ToolbarParam = {
    cat: ButtonCategory.IMPORT_EXPORT,
    id: 'screenshot',
    displayName: 'Screenshot',
    allImg: Bitmaps.ImgScreenshot,
    overImg: Bitmaps.ImgOverScreenshot,
    disableImg: Bitmaps.ImgGreyScreenshot,
    tooltip: 'Take a screenshot'
};

// ===== VIEW =====

export const nucleotideFindButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'find',
    displayName: 'Find Nucleotide',
    allImg: Bitmaps.ImgNucleotideFind,
    overImg: Bitmaps.ImgOverNucleotideFind,
    disableImg: Bitmaps.ImgGreyNucleotideFind,
    tooltip: 'Type a nucleotide index to put it in the center of the screen (J)',
    hotKey: KeyCode.KeyJ
};

export const nucleotideRangeButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'range',
    displayName: 'View Range',
    allImg: Bitmaps.ImgNucleotideRange,
    overImg: Bitmaps.ImgOverNucleotideRange,
    disableImg: Bitmaps.ImgGreyNucleotideRange,
    tooltip: 'Enter a nucleotide range to view (V)',
    hotKey: KeyCode.KeyV
};

export const explosionFactorButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'explosionFactor',
    displayName: 'Explosion Factor',
    allImg: Bitmaps.ImgExplosionFactor,
    overImg: Bitmaps.ImgOverExplosionFactor,
    disableImg: Bitmaps.ImgGreyExplosionFactor,
    tooltip: 'Set explosion factor ([, ])'
};

export const pipButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'pip',
    displayName: 'PiP',
    allImg: Bitmaps.ImgPip,
    overImg: Bitmaps.ImgOverPip,
    disableImg: Bitmaps.ImgGreyPip,
    tooltip: 'Set PiP (Picture in Picture) mode (P)',
    hotKey: KeyCode.KeyP,
    rscriptID: RScriptUIElementID.PIP
};

export const zoomInButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'zoomIn',
    displayName: 'Zoom In',
    allImg: Bitmaps.ImgZoomIn,
    overImg: Bitmaps.ImgOverZoomIn,
    disableImg: Bitmaps.ImgGreyZoomIn,
    tooltip: 'Zoom in (=)',
    hotKey: KeyCode.Equal,
    rscriptID: RScriptUIElementID.ZOOMIN
};

export const zoomOutButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'zoomOut',
    displayName: 'Zoom Out',
    allImg: Bitmaps.ImgZoomOut,
    overImg: Bitmaps.ImgOverZoomOut,
    disableImg: Bitmaps.ImgGreyZoomOut,
    tooltip: 'Zoom out (-)',
    hotKey: KeyCode.Minus,
    rscriptID: RScriptUIElementID.ZOOMOUT
};

export const view3DButtonProps: ToolbarParam = {
    cat: ButtonCategory.VIEW,
    id: 'view3D',
    displayName: 'View 3D Window',
    allImg: Bitmaps.ImgThreeWindow,
    overImg: Bitmaps.ImgOverThreeWindow,
    disableImg: Bitmaps.ImgGreyThreeWindow,
    tooltip: 'View 3D window'
};

// ===== CUSTOM LAYOUT =====

export const moveButtonProps: ToolbarParam = {
    cat: ButtonCategory.CUSTOM_LAYOUT,
    id: 'move',
    displayName: 'Move',
    allImg: Bitmaps.ImgMove,
    overImg: Bitmaps.ImgOverMove,
    disableImg: Bitmaps.ImgGreyMove,
    tooltip: 'Move a nucleotide or stem by Ctrl-Shift-Click'
};

export const rotateStemButtonProps: ToolbarParam = {
    cat: ButtonCategory.CUSTOM_LAYOUT,
    id: 'rotateStem',
    displayName: 'Rotate Stem',
    allImg: Bitmaps.ImgRotateStem,
    overImg: Bitmaps.ImgOverRotateStem,
    disableImg: Bitmaps.ImgGreyRotateStem,
    tooltip: 'Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click'
};

export const flipStemButtonProps: ToolbarParam = {
    cat: ButtonCategory.CUSTOM_LAYOUT,
    id: 'flipStem',
    displayName: 'Flip Stem',
    allImg: Bitmaps.ImgFlipStem,
    overImg: Bitmaps.ImgOverFlipStem,
    disableImg: Bitmaps.ImgGreyFlipStem,
    tooltip: 'Flip stem by Ctrl-Shift-Click'
};

export const snapToGridButtonProps: ToolbarParam = {
    cat: ButtonCategory.CUSTOM_LAYOUT,
    id: 'snapToGrid',
    displayName: 'Snap to Grid',
    allImg: Bitmaps.ImgSnapToGrid,
    overImg: Bitmaps.ImgOverSnapToGrid,
    disableImg: Bitmaps.ImgGreySnapToGrid,
    tooltip: 'Snap current layout to a grid'
};

// ===== ANNOTATION =====

export const baseMarkerButtonProps: ToolbarParam = {
    cat: ButtonCategory.ANNOTATE,
    id: 'baseMarker',
    displayName: 'Base Marker',
    isPaintTool: true,
    allImg: Bitmaps.ImgBaseMarker,
    overImg: Bitmaps.ImgOverBaseMarker,
    disableImg: Bitmaps.ImgGreyBaseMarker,
    tooltip: 'Mark bases (hold ctrl)'
};

export const annotationModeButtonProps: ToolbarParam = {
    cat: ButtonCategory.ANNOTATE,
    id: 'addAnnotations',
    displayName: 'Add Annotations',
    isPaintTool: true,
    allImg: Bitmaps.ImgAnnotationMode,
    overImg: Bitmaps.ImgOverAnnotationMode,
    disableImg: Bitmaps.ImgGreyAnnotationMode,
    tooltip: 'Add annotations'
};

export const annotationPanelButtonProps: ToolbarParam = {
    cat: ButtonCategory.ANNOTATE,
    id: 'annotationPanel',
    displayName: 'Annotation Panel',
    allImg: Bitmaps.ImgAnnotationPanel,
    overImg: Bitmaps.ImgOverAnnotationPanel,
    disableImg: Bitmaps.ImgGreyAnnotationPanel,
    tooltip: 'Annotation panel'
};
