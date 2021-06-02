import * as log from 'loglevel';
import EternaApp from 'eterna/EternaApp';
import * as PIXI from 'pixi.js';

const isProduction = process.env.NODE_ENV === 'production';
log.setLevel(isProduction ? 'info' : 'trace');

declare global {
    interface Window {
        EternaApp: typeof EternaApp;
        app: EternaApp; // this syntax is used in index.html.tmpl, at least...
        PIXI?: typeof PIXI;
    }
}

window.EternaApp = EternaApp;
// So we can use https://github.com/bfanger/pixi-inspector
if (!isProduction) window.PIXI = PIXI;
