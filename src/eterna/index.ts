import * as log from 'loglevel';
import EternaApp from 'eterna/EternaApp';
import FoldingAPIApp from 'eterna/FoldingAPIApp';
import * as PIXI from 'pixi.js';

const isProduction = process.env.NODE_ENV === 'production';
log.setLevel(isProduction ? 'info' : 'trace');

declare global {
    interface Window {
        EternaApp: typeof EternaApp;
        FoldingAPIApp: typeof FoldingAPIApp;
        app: EternaApp; // this syntax is used in index.html.tmpl, at least...
        __PIXI_APP__?: PIXI.Application;
    }
}

window.EternaApp = EternaApp;
window.FoldingAPIApp = FoldingAPIApp;
